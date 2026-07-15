# Legacy database migrations

The SQL files in `migrations/` record the five migrations that were originally
run by hand in **Supabase Dashboard > SQL Editor**:

1. `0001_initial_backend.sql`
2. `0002_staff_users.sql`
3. `0003_product_images.sql`
4. `0004_admin_audit_logs.sql`
5. `0005_security_foundation.sql`

They are retained for audit history only. Do not run them again on the linked
project and do not add new migrations to this directory.

The executable migration source of truth is now `../supabase/migrations/`.
Its initial baseline was pulled from the hosted database with Migra and marked
as already applied in the remote migration history. See `../supabase/README.md`
for the local and hosted migration workflow.

After migrations run, execute `pnpm supabase:verify` from `frontend/`. The
verification command checks connectivity and the anonymous/private access
boundaries without displaying credentials or row data.

## First owner

Create and confirm a user under **Authentication > Users**, then run this in the
SQL Editor with the correct email:

```sql
insert into public.staff_users (user_id, email, display_name, role, is_active)
select id, lower(email), 'Store Owner', 'owner', true
from auth.users
where lower(email) = lower('owner@example.com');
```

The owner signs in through `http://localhost:3000/admin/login`. Both the Auth
user and the active `staff_users` record are required.
