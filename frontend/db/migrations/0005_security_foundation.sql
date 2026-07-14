begin;

-- Keep authorization helpers outside the API-exposed public schema. The
-- authenticated role needs USAGE so policies can call the helper, but it does
-- not receive CREATE on this schema.
create schema if not exists private;

revoke all privileges on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

-- SECURITY DEFINER is intentional: staff_users is itself protected by RLS, so
-- evaluating this lookup as the migration owner avoids recursive staff_users
-- policy evaluation. Every object name is schema-qualified and search_path is
-- empty to prevent object-shadowing attacks.
create or replace function private.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_users as staff
    where staff.user_id = (select auth.uid())
      and staff.is_active = true
      and staff.role = any (coalesce(allowed_roles, array[]::text[]))
  );
$$;

revoke all privileges on function private.has_staff_role(text[])
  from public, anon, authenticated;
grant execute on function private.has_staff_role(text[])
  to authenticated, service_role;

comment on function private.has_staff_role(text[]) is
  'Returns whether the current authenticated user has an active staff record with one of the supplied roles.';

-- Tables created through the SQL editor do not get RLS automatically.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.staff_users enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Remove ambient/default API grants first, then add only the access used by
-- the policies below. service_role remains the trusted backend boundary used
-- by validated Route Handlers, payment webhooks, and audit logging.
revoke all privileges on table public.products
  from public, anon, authenticated;
revoke all privileges on table public.orders
  from public, anon, authenticated;
revoke all privileges on table public.newsletter_subscribers
  from public, anon, authenticated;
revoke all privileges on table public.staff_users
  from public, anon, authenticated;
revoke all privileges on table public.admin_audit_logs
  from public, anon, authenticated;

grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.staff_users to authenticated;

grant all privileges on table public.products to service_role;
grant all privileges on table public.orders to service_role;
grant all privileges on table public.newsletter_subscribers to service_role;
grant all privileges on table public.staff_users to service_role;
grant all privileges on table public.admin_audit_logs to service_role;

-- Public catalogue reads expose only active products. An ordinary signed-in
-- customer receives the same catalogue visibility as an anonymous visitor.
drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- Every active staff role may inspect inactive products in the portal.
drop policy if exists "products_active_staff_read_all" on public.products;
create policy "products_active_staff_read_all"
on public.products
for select
to authenticated
using (
  (select private.has_staff_role(
    array['owner', 'admin', 'inventory', 'support']::text[]
  ))
);

-- Support staff can inspect the catalogue but cannot change it. Product write
-- policies deliberately exclude support and all non-staff authenticated users.
drop policy if exists "products_catalogue_staff_insert" on public.products;
create policy "products_catalogue_staff_insert"
on public.products
for insert
to authenticated
with check (
  (select private.has_staff_role(
    array['owner', 'admin', 'inventory']::text[]
  ))
);

drop policy if exists "products_catalogue_staff_update" on public.products;
create policy "products_catalogue_staff_update"
on public.products
for update
to authenticated
using (
  (select private.has_staff_role(
    array['owner', 'admin', 'inventory']::text[]
  ))
)
with check (
  (select private.has_staff_role(
    array['owner', 'admin', 'inventory']::text[]
  ))
);

drop policy if exists "products_catalogue_staff_delete" on public.products;
create policy "products_catalogue_staff_delete"
on public.products
for delete
to authenticated
using (
  (select private.has_staff_role(
    array['owner', 'admin', 'inventory']::text[]
  ))
);

-- Order PII is never public. Active owner/admin/support users may read orders,
-- but no anon/authenticated role receives INSERT, UPDATE, or DELETE privileges.
-- Status changes continue through validated server routes using service_role.
drop policy if exists "orders_authorized_staff_read" on public.orders;
create policy "orders_authorized_staff_read"
on public.orders
for select
to authenticated
using (
  (select private.has_staff_role(
    array['owner', 'admin', 'support']::text[]
  ))
);

-- Active staff can read their own authorization record. Active owners may list
-- all records for staff administration. Writes remain server-only so role and
-- last-owner invariants stay in the validated admin endpoint.
drop policy if exists "staff_users_active_self_or_owner_read" on public.staff_users;
create policy "staff_users_active_self_or_owner_read"
on public.staff_users
for select
to authenticated
using (
  (user_id = (select auth.uid()) and is_active = true)
  or (select private.has_staff_role(array['owner']::text[]))
);

-- newsletter_subscribers and admin_audit_logs intentionally have no client
-- policies or anon/authenticated grants. Newsletter writes and append-only
-- audit inserts remain server-side operations performed with service_role.

-- A public Storage bucket serves object bytes through its public URL without a
-- SELECT policy on storage.objects. Removing this policy prevents anonymous
-- object metadata queries/listing while keeping existing public image URLs
-- readable. Upload/update/delete operations remain server-only via service_role.
drop policy if exists "Public product image reads" on storage.objects;

commit;
