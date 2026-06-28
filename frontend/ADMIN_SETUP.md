# Admin setup

The admin portal uses Supabase Auth for identity and the `staff_users` table for authorization. A Supabase user is not granted admin access until a matching active staff record exists.

## Required environment variables

Configure these values locally and in the Vercel project:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to browser code.

## Apply the database migrations

Run the SQL files in order through the Supabase SQL editor:

1. `db/migrations/0001_initial_backend.sql`
2. `db/migrations/0002_staff_users.sql`
3. `db/migrations/0003_product_images.sql`

## Create the first owner

1. In Supabase, open **Authentication > Users**.
2. Create the staff user with email and password.
3. Run the following SQL, replacing the email and display name:

```sql
insert into public.staff_users (user_id, email, display_name, role)
select id, email, 'Store Owner', 'owner'
from auth.users
where lower(email) = lower('owner@example.com');
```

The statement should report one inserted row. If it inserts no rows, the Auth user email does not match.

Public staff registration should remain disabled. Additional staff accounts must be created by an owner or directly in the Supabase dashboard until the staff-management UI is implemented.
