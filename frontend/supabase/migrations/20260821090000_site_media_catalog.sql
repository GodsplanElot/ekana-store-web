begin;

create table if not exists public.site_media (
  id uuid primary key default gen_random_uuid(),
  placement text not null,
  title text,
  alt_text text not null,
  caption text,
  image_url text not null,
  storage_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.staff_users(id) on delete set null,
  updated_by uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_media_placement_check check (placement in ('home_hero')),
  constraint site_media_alt_text_check check (char_length(btrim(alt_text)) between 3 and 180),
  constraint site_media_title_check check (title is null or char_length(btrim(title)) between 1 and 120),
  constraint site_media_caption_check check (caption is null or char_length(btrim(caption)) <= 220),
  constraint site_media_image_url_check check (image_url ~ '^https?://')
);

create index if not exists site_media_public_order_idx
on public.site_media (placement, sort_order asc, created_at asc)
where is_active = true;

create index if not exists site_media_admin_order_idx
on public.site_media (placement, sort_order asc, created_at asc);

drop trigger if exists site_media_set_updated_at on public.site_media;
create trigger site_media_set_updated_at
before update on public.site_media
for each row execute function private.set_updated_at();

alter table public.site_media enable row level security;

revoke all privileges on table public.site_media from public, anon, authenticated;
grant select on table public.site_media to anon, authenticated;
grant insert, update, delete on table public.site_media to authenticated;
grant all privileges on table public.site_media to service_role;

create policy "site_media_public_read_active"
on public.site_media
for select
to anon, authenticated
using (is_active = true);

create policy "site_media_staff_read_all"
on public.site_media
for select
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory', 'support']::text[])));

create policy "site_media_staff_insert"
on public.site_media
for insert
to authenticated
with check ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])));

create policy "site_media_staff_update"
on public.site_media
for update
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])))
with check ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])));

create policy "site_media_staff_delete"
on public.site_media
for delete
to authenticated
using ((select private.has_staff_role(array['owner', 'admin', 'inventory']::text[])));

comment on table public.site_media is 'Ordered storefront media placements managed from the staff portal.';
comment on column public.site_media.placement is 'Named storefront slot. home_hero powers the intro carousel.';
comment on column public.site_media.image_url is 'Public image URL, usually from the product-images Storage bucket.';

commit;
