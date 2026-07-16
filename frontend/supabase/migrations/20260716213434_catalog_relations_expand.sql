begin;

set local lock_timeout = '10s';
set local statement_timeout = '2min';

-- Keep the legacy source rows stable while preflight checks and backfills run.
lock table public.products in share row exclusive mode;

-- The pulled baseline preserved legacy broad defaults. New database objects must
-- be granted deliberately by the migration that creates them.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on functions from anon, authenticated;

do $catalog_preflight$
declare
  problem text;
begin
  select string_agg(id, ', ' order by id)
  into problem
  from (
    select id
    from public.products
    where char_length(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')) not between 2 and 120
    order by id
    limit 10
  ) as bad_categories;

  if problem is not null then
    raise exception 'Catalog migration blocked: products have blank, too-short, or over-120-character categories. Sample product ids: %', problem
      using hint = 'Normalize products.category to a 2-120 character value, then rerun the migration.';
  end if;

  with normalized as (
    select distinct
      lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')) as category_key,
      regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g') as category_name
    from public.products
  ), canonical as (
    select category_key, min(category_name) as category_name
    from normalized
    group by category_key
  ), prepared as (
    select
      category_name,
      regexp_replace(
        lower(regexp_replace(category_name, '[^a-zA-Z0-9]+', '-', 'g')),
        '(^-+|-+$)', '', 'g'
      ) as slug
    from canonical
  )
  select string_agg(category_name, ' | ' order by category_name)
  into problem
  from prepared
  where slug = '';

  if problem is not null then
    raise exception 'Catalog migration blocked: category names cannot produce an ASCII URL slug: %', problem
      using hint = 'Rename those legacy categories or provide an explicit mapping migration.';
  end if;

  with normalized as (
    select distinct
      lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')) as category_key,
      regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g') as category_name
    from public.products
  ), canonical as (
    select category_key, min(category_name) as category_name
    from normalized
    group by category_key
  ), prepared as (
    select
      category_name,
      regexp_replace(
        lower(regexp_replace(category_name, '[^a-zA-Z0-9]+', '-', 'g')),
        '(^-+|-+$)', '', 'g'
      ) as slug
    from canonical
  ), collisions as (
    select slug, string_agg(category_name, ' | ' order by category_name) as category_names
    from prepared
    group by slug
    having count(*) > 1
    order by slug
    limit 10
  )
  select string_agg(slug || ' <= ' || category_names, '; ' order by slug)
  into problem
  from collisions;

  if problem is not null then
    raise exception 'Catalog migration blocked: different categories generate the same slug: %', problem
      using hint = 'Resolve the category names or supply explicit unique slugs before rerunning.';
  end if;

  with candidates as (
    select id, regexp_replace(btrim(image_url), '[?#].*$', '') as clean_url
    from public.products
  )
  select string_agg(id, ', ' order by id)
  into problem
  from (
    select id
    from candidates
    where clean_url !~* '^https?://[^/]+/storage/v1/object/public/product-images/.+$'
    order by id
    limit 10
  ) as invalid_urls;

  if problem is not null then
    raise exception 'Catalog migration blocked: legacy image_url is not a product-images public object URL. Sample product ids: %', problem
      using hint = 'Move external images into product-images and store their canonical public object URL before rerunning.';
  end if;

  with candidates as (
    select
      id,
      regexp_replace(
        regexp_replace(btrim(image_url), '[?#].*$', ''),
        '^https?://[^/]+/storage/v1/object/public/product-images/',
        '', 'i'
      ) as storage_path
    from public.products
  )
  select string_agg(id || ' => ' || storage_path, '; ' order by id)
  into problem
  from (
    select id, storage_path
    from candidates
    where storage_path !~ '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$'
       or storage_path ~ '(^|/)\.{1,2}(/|$)'
       or storage_path like '%//%'
       or position('%' in storage_path) > 0
    order by id
    limit 10
  ) as invalid_paths;

  if problem is not null then
    raise exception 'Catalog migration blocked: image URL paths cannot safely become Storage object keys: %', problem
      using hint = 'Use unencoded generated keys containing letters, digits, dot, underscore, slash, or hyphen.';
  end if;

  with candidates as (
    select regexp_replace(
      regexp_replace(btrim(image_url), '[?#].*$', ''),
      '^https?://[^/]+/storage/v1/object/public/product-images/',
      '', 'i'
    ) as storage_path
    from public.products
  ), duplicates as (
    select storage_path, count(*) as product_count
    from candidates
    group by storage_path
    having count(*) > 1
    order by storage_path
    limit 10
  )
  select string_agg(storage_path || ' (' || product_count || ' products)', '; ' order by storage_path)
  into problem
  from duplicates;

  if problem is not null then
    raise exception 'Catalog migration blocked: one Storage key is shared by multiple products: %', problem
      using hint = 'Give each product its own object before rerunning the migration.';
  end if;
end
$catalog_preflight$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  image_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length_check check (char_length(name) between 2 and 120),
  constraint categories_name_normalized_check check (name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')),
  constraint categories_slug_format_check check (char_length(slug) between 1 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_description_length_check check (description is null or char_length(description) <= 2000),
  constraint categories_image_path_check check (
    image_path is null
    or (
      image_path ~ '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$'
      and image_path !~ '(^|/)\.{1,2}(/|$)'
      and image_path not like '%//%'
      and position('%' in image_path) = 0
    )
  ),
  constraint categories_display_order_check check (display_order >= 0),
  constraint categories_created_by_fkey foreign key (created_by) references public.staff_users(id) on delete set null,
  constraint categories_updated_by_fkey foreign key (updated_by) references public.staff_users(id) on delete set null,
  constraint categories_slug_key unique (slug)
);

create unique index categories_lower_name_key on public.categories (lower(name));
create index categories_active_display_idx on public.categories (display_order, name) where is_active = true;

alter table public.products
  add column category_id uuid,
  add column created_by uuid,
  add column updated_by uuid,
  add constraint products_category_id_fkey foreign key (category_id) references public.categories(id) on delete restrict,
  add constraint products_created_by_fkey foreign key (created_by) references public.staff_users(id) on delete set null,
  add constraint products_updated_by_fkey foreign key (updated_by) references public.staff_users(id) on delete set null;

create index products_category_id_idx on public.products (category_id);
create index products_active_category_idx on public.products (category_id, created_at desc) where is_active = true;

with normalized as (
  select
    lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')) as category_key,
    regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g') as category_name
  from public.products
), canonical as (
  select category_key, min(category_name) as category_name
  from normalized
  group by category_key
), prepared as (
  select
    category_name,
    regexp_replace(
      lower(regexp_replace(category_name, '[^a-zA-Z0-9]+', '-', 'g')),
      '(^-+|-+$)', '', 'g'
    ) as slug
  from canonical
)
insert into public.categories (name, slug, display_order)
select
  category_name,
  slug,
  (row_number() over (order by lower(category_name), category_name) - 1)::integer
from prepared;

update public.products as product
set category_id = category.id
from public.categories as category
where lower(regexp_replace(btrim(product.category), '[[:space:]]+', ' ', 'g')) = lower(category.name);

do $category_backfill$
begin
  if exists (select 1 from public.products where category_id is null) then
    raise exception 'Catalog migration invariant failed: an existing product was not assigned a category_id.';
  end if;
end
$category_backfill$;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  storage_path text not null,
  alt_text text not null default '',
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade,
  constraint product_images_created_by_fkey foreign key (created_by) references public.staff_users(id) on delete set null,
  constraint product_images_updated_by_fkey foreign key (updated_by) references public.staff_users(id) on delete set null,
  constraint product_images_storage_path_key unique (storage_path),
  constraint product_images_storage_path_check check (
    storage_path ~ '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$'
    and storage_path !~ '(^|/)\.{1,2}(/|$)'
    and storage_path not like '%//%'
    and position('%' in storage_path) = 0
  ),
  constraint product_images_alt_text_length_check check (char_length(alt_text) <= 300),
  constraint product_images_display_order_check check (display_order >= 0),
  constraint product_images_product_order_key unique (product_id, display_order)
);

create index product_images_product_order_idx on public.product_images (product_id, display_order, created_at);
create unique index product_images_one_primary_per_product_idx on public.product_images (product_id) where is_primary = true;

with parsed as (
  select
    id as product_id,
    name as alt_text,
    regexp_replace(
      regexp_replace(btrim(image_url), '[?#].*$', ''),
      '^https?://[^/]+/storage/v1/object/public/product-images/',
      '', 'i'
    ) as storage_path
  from public.products
)
insert into public.product_images (product_id, storage_path, alt_text, display_order, is_primary)
select product_id, storage_path, alt_text, 0, true
from parsed;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end
$function$;

revoke all on function private.set_updated_at() from public;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function private.set_updated_at();

alter table public.categories enable row level security;
alter table public.product_images enable row level security;

revoke all privileges on table public.categories from public, anon, authenticated;
revoke all privileges on table public.product_images from public, anon, authenticated;

grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;
grant select on table public.product_images to anon, authenticated;
grant insert, update, delete on table public.product_images to authenticated;
grant all privileges on table public.categories to service_role;
grant all privileges on table public.product_images to service_role;

create policy "categories_public_read_active"
on public.categories
for select
to anon, authenticated
using (is_active = true);

create policy "categories_active_staff_read_all"
on public.categories
for select
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory', 'support']::text[])));

create policy "categories_taxonomy_staff_insert"
on public.categories
for insert
to authenticated
with check ((select private.has_staff_role(array['owner', 'admin']::text[])));

create policy "categories_taxonomy_staff_update"
on public.categories
for update
to authenticated
using ((select private.has_staff_role(array['owner', 'admin']::text[])))
with check ((select private.has_staff_role(array['owner', 'admin']::text[])));

create policy "categories_taxonomy_staff_delete"
on public.categories
for delete
to authenticated
using ((select private.has_staff_role(array['owner', 'admin']::text[])));

drop policy if exists "products_public_read_active" on public.products;

create policy "products_public_read_active"
on public.products
for select
to anon, authenticated
using (
  is_active = true
  and (
    category_id is null
    or exists (
      select 1
      from public.categories as category
      where category.id = products.category_id
        and category.is_active = true
    )
  )
);

create policy "product_images_public_read_active_catalog"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products as product
    join public.categories as category on category.id = product.category_id
    where product.id = product_images.product_id
      and product.is_active = true
      and category.is_active = true
  )
);

create policy "product_images_active_staff_read_all"
on public.product_images
for select
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory', 'support']::text[])));

create policy "product_images_catalogue_staff_insert"
on public.product_images
for insert
to authenticated
with check ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])));

create policy "product_images_catalogue_staff_update"
on public.product_images
for update
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])))
with check ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])));

create policy "product_images_catalogue_staff_delete"
on public.product_images
for delete
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])));

comment on table public.categories is 'Storefront taxonomy. Writes are limited to active owner/admin staff.';
comment on table public.product_images is 'Ordered relational metadata for objects in the public product-images Storage bucket.';
comment on column public.products.category_id is 'Relational category reference; legacy category text remains during expand/contract rollout.';
comment on column public.products.created_by is 'Nullable staff attribution; existing rows predate relational catalog auditing.';
comment on column public.products.updated_by is 'Nullable staff attribution for the most recent application write.';

commit;
