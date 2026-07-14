# Admin setup

The admin portal uses Supabase Auth for identity and the `staff_users` table for authorization. A Supabase user is not granted admin access until a matching active staff record exists.

## Required environment variables

Configure these values locally and in the Vercel project:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

The secret key is server-only and bypasses Row Level Security. Never prefix it with
`NEXT_PUBLIC_`, expose it to browser code, or commit it to Git.

## Apply the database migrations

Run the SQL files in order through the Supabase SQL editor:

1. `db/migrations/0001_initial_backend.sql`
2. `db/migrations/0002_staff_users.sql`
3. `db/migrations/0003_product_images.sql`
4. `db/migrations/0004_admin_audit_logs.sql`
5. `db/migrations/0005_security_foundation.sql`

Then, from `frontend`, run:

```powershell
pnpm supabase:verify
```

Every verifier check must pass before adding real customer or order data.

## Create the first owner

1. In Supabase, open **Authentication > Users**.
2. Create and confirm the staff user with a strong password.
3. Run the following SQL, replacing the email and display name:

```sql
insert into public.staff_users (user_id, email, display_name, role, is_active)
select id, lower(email), 'Store Owner', 'owner', true
from auth.users
where lower(email) = lower('owner@example.com');
```

The statement should report one inserted row. If it inserts no rows, the Auth user email does not match.

Public staff registration should remain disabled. After bootstrapping the first
owner, an owner should invite additional staff through `/admin/staff`. Use the
Supabase dashboard only for initial bootstrap or account recovery.

## Local authentication test

Set the Supabase Auth Site URL to `http://localhost:3000` and allow
`http://localhost:3000/auth/callback`. Start the app, visit
`http://localhost:3000/admin/login`, and sign in with the confirmed Auth user.
Admin access requires both a valid Supabase session and the matching active
`staff_users` row. There is no development authentication bypass.
