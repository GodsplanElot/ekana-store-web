# Database setup

The hosted Supabase project is initialized from the SQL files in `migrations/`.
Run them in filename order in **Supabase Dashboard > SQL Editor**:

1. `0001_initial_backend.sql`
2. `0002_staff_users.sql`
3. `0003_product_images.sql`
4. `0004_admin_audit_logs.sql`
5. `0005_security_foundation.sql`

Do not enter customer or order data until `0005_security_foundation.sql` has
completed successfully. It applies the explicit grants and Row Level Security
policies for the public Data API.

After all migrations run, execute `pnpm supabase:verify` from `frontend/`. The
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
