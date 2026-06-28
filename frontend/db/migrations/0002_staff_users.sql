create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('owner', 'admin', 'inventory', 'support')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_users_active_user_id_idx
  on staff_users (user_id)
  where is_active = true;

alter table staff_users enable row level security;

comment on table staff_users is
  'Server-managed authorization records for authenticated Ekana staff.';
