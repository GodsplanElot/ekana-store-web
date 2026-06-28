create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references staff_users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_entity_idx
  on admin_audit_logs (entity_type, entity_id, created_at desc);

create index if not exists admin_audit_logs_staff_idx
  on admin_audit_logs (staff_user_id, created_at desc);

alter table admin_audit_logs enable row level security;

comment on table admin_audit_logs is
  'Append-only record of sensitive actions performed through the staff portal.';
