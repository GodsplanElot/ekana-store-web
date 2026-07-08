# Supabase Setup Phases

This guide links the Ekana Store web app to Supabase one phase at a time.

The app is already prepared for Supabase. It has Supabase clients, server-only admin access, SQL migrations, admin auth routes, product APIs, order APIs, newsletter APIs, and product image upload support.

## Current Backend Shape

Supabase will be used for:

- Products
- Orders
- Newsletter subscribers
- Staff/admin authentication
- Staff roles and authorization
- Product image storage
- Admin audit logs

The app also integrates with:

- Paystack for payment initialization and verification
- Resend for order emails
- Vercel for deployment and analytics

## Important Current Code Assumption

This code currently expects these Supabase environment variable names:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for browser use. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to frontend code.

Supabase now recommends publishable and secret keys for new projects, but this app currently uses the legacy `anon` and `service_role` names. For the fastest setup, use the legacy keys now. A later cleanup phase can rename the app to use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.

## Phase 1: Create Or Confirm The Supabase Project

Goal: have one Supabase project ready for this store.

Steps:

1. Open the Supabase dashboard.
2. Create a new project, or open the existing Ekana project.
3. Save the database password somewhere secure.
4. Open the project settings and collect:
   - Project URL
   - Legacy `anon` key
   - Legacy `service_role` key
   - Database connection string

Local environment file:

```txt
frontend/.env.local
```

Add or confirm:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-postgres-connection-string
```

Stop after this phase until the keys are present locally.

## Phase 2: Create The Database Tables

Goal: create all tables and storage needed by the app.

For the first setup, use the existing SQL migrations. Run them in order in the Supabase SQL Editor:

```txt
frontend/db/migrations/0001_initial_backend.sql
frontend/db/migrations/0002_staff_users.sql
frontend/db/migrations/0003_product_images.sql
frontend/db/migrations/0004_admin_audit_logs.sql
```

These migrations create:

- `products`
- `orders`
- `newsletter_subscribers`
- `staff_users`
- `admin_audit_logs`
- `product-images` storage bucket
- public read policy for product images

After running the SQL, check Supabase Table Editor for the tables above.

Stop after this phase until all tables exist.

## Phase 3: Configure Auth For Admin Access

Goal: make `/admin/login` work with Supabase Auth.

Steps:

1. In Supabase, open Authentication.
2. Ensure Email/Password login is enabled.
3. Add redirect URLs for local development:

```txt
http://localhost:3000/auth/callback
```

4. Later, add the production redirect URL:

```txt
https://your-production-domain.com/auth/callback
```

The app signs staff in with email and password from:

```txt
/admin/login
```

Staff invitations redirect through:

```txt
/auth/callback?next=/admin/set-password
```

Stop after this phase until Supabase Auth is configured.

## Phase 4: Add The First Owner Account

Goal: create one admin owner who can access the staff portal.

Steps:

1. In Supabase, open Authentication > Users.
2. Create the first user manually with email and password.
3. Open SQL Editor.
4. Run this SQL, replacing the email and display name:

```sql
insert into public.staff_users (user_id, email, display_name, role)
select id, email, 'Store Owner', 'owner'
from auth.users
where lower(email) = lower('owner@example.com');
```

The SQL should insert one row.

If it inserts zero rows, the email does not match the Supabase Auth user.

Stop after this phase until the first owner can log in.

## Phase 5: Add Product Data

Goal: make the storefront read real products from Supabase instead of seed data.

The app expects these product categories exactly:

```txt
Glosses
Lip Liners
Lashes
Lash Trays
```

Product table columns:

```txt
id
slug
name
description
category
price
image_url
shade
features
inventory_count
is_active
is_featured
is_restocked
created_at
updated_at
```

Example product insert:

```sql
insert into public.products (
  id,
  slug,
  name,
  description,
  category,
  price,
  image_url,
  shade,
  features,
  inventory_count,
  is_active,
  is_featured,
  is_restocked
) values (
  'gloss-rose-glow',
  'rose-glow-lip-gloss',
  'Rose Glow Lip Gloss',
  'A soft rose gloss with a smooth high-shine finish.',
  'Glosses',
  6500,
  '/images/product-1.jpg',
  'Rose Glow',
  '["High-shine finish", "Comfortable wear", "Patch test recommended"]'::jsonb,
  25,
  true,
  true,
  false
);
```

Notes:

- `price` is stored as an integer in naira.
- `image_url` can be a local public path like `/images/product-1.jpg` or a Supabase Storage public URL.
- `features` must be valid JSONB.
- `inventory_count` controls whether the app treats the product as in stock.
- `is_active = false` hides the product from the storefront.

Stop after this phase when `/api/products` returns Supabase products.

## Phase 6: Configure Product Image Storage

Goal: allow admin users to upload product images.

The migration `0003_product_images.sql` creates this bucket:

```txt
product-images
```

Bucket behavior:

- Public reads are allowed.
- Uploads are performed by server routes using the service-role key.
- Allowed file types are JPEG, PNG, and WebP.
- Maximum file size is 5 MB.

The admin upload route is:

```txt
/api/admin/uploads/product-image
```

Stop after this phase when image upload works from the admin product form.

## Phase 7: Test Local Supabase Connection

Goal: verify the local app is reading and writing Supabase data.

From the repo root, run:

```powershell
pnpm.cmd --dir frontend dev
```

Then test these URLs:

```txt
http://localhost:3000/api/products
http://localhost:3000/admin/login
http://localhost:3000/admin/products
http://localhost:3000/admin/orders
```

Expected behavior:

- `/api/products` returns `{ "source": "supabase" }`.
- `/admin/login` accepts the first owner account.
- `/admin/products` can create, edit, deactivate, and upload images.
- Checkout inserts into the `orders` table.
- Newsletter form inserts into `newsletter_subscribers`.

Stop after this phase when local Supabase behavior works end to end.

## Phase 8: Production Environment Variables

Goal: make the deployed app use the same Supabase project.

In Vercel, add:

```txt
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
PAYSTACK_SECRET_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ORDER_NOTIFICATION_EMAIL=
```

Also update Supabase Auth redirect URLs:

```txt
https://your-production-domain.com/auth/callback
```

Stop after this phase when production can log in and read products.

## Can Migrations Be Made Here From Schemas?

Yes.

This project already has a Drizzle schema here:

```txt
frontend/db/schema.ts
```

It also has Drizzle config here:

```txt
frontend/drizzle.config.ts
```

For future database changes, use this workflow:

1. Edit `frontend/db/schema.ts`.
2. Generate a migration:

```powershell
pnpm.cmd --dir frontend exec drizzle-kit generate
```

3. Review the generated SQL in:

```txt
frontend/db/migrations
```

4. Apply the migration to Supabase.

Manual SQL Editor method:

```txt
Copy the generated SQL file into Supabase SQL Editor and run it.
```

CLI method:

```powershell
$env:DATABASE_URL="your-supabase-postgres-connection-string"
pnpm.cmd --dir frontend exec drizzle-kit migrate
```

Use the direct database connection string for migrations when your network supports it. If the direct connection fails, the Supabase SQL Editor is the simplest fallback.

## When To Use Existing SQL vs Generated Migrations

Use the existing SQL files now for the first setup:

```txt
0001_initial_backend.sql
0002_staff_users.sql
0003_product_images.sql
0004_admin_audit_logs.sql
```

Use Drizzle-generated migrations later when changing table structure, for example:

- Add a product field
- Add customer accounts
- Add discounts
- Add product reviews
- Add delivery zones
- Add inventory history

Use hand-written SQL for Supabase-specific setup that Drizzle does not fully model, for example:

- Storage buckets
- Storage policies
- RLS policies
- Auth-related SQL
- Database functions
- Triggers

## Recommended Security Hardening Before Launch

The app currently uses server routes with the service-role client for sensitive operations. Before production launch, add a hardening migration that enables RLS on public tables and adds only the policies you actually need.

Recommended direction:

- Keep `orders` server-only.
- Keep `newsletter_subscribers` server-only.
- Keep `staff_users` server-only.
- Keep `admin_audit_logs` server-only.
- Either keep `products` server-only through `/api/products`, or allow public read-only access to active products.

Do not expose the service-role key in browser code.

## Verification Commands

Run these before deployment:

```powershell
pnpm.cmd --dir frontend lint
pnpm.cmd --dir frontend build
```

## Phase Completion Checklist

- [ ] Phase 1: Supabase project exists and env vars are collected.
- [ ] Phase 2: Database migrations are applied.
- [ ] Phase 3: Supabase Auth redirect URLs are configured.
- [ ] Phase 4: First owner account can log in.
- [ ] Phase 5: Products exist in Supabase.
- [ ] Phase 6: Product image upload works.
- [ ] Phase 7: Local app reads and writes Supabase data.
- [ ] Phase 8: Production env vars are configured.

## References

- Supabase Next.js SSR guide: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase database connection guide: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase Storage buckets guide: https://supabase.com/docs/guides/storage/buckets/fundamentals
