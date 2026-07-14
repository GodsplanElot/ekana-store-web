You are working inside my existing **EKANA Cosmetics mini e-commerce Next.js repository**. Your task is to inspect the entire codebase first, identify the exact Next.js version, routing structure, package manager, TypeScript setup, existing authentication, existing admin pages, current environment-variable pattern, deployment configuration, and any database-related code before proposing changes.

Create a **top-level, highly summarized but comprehensive step-by-step implementation plan** for integrating **Supabase as the production backend and PostgreSQL database**, with the Next.js application hosted on **Vercel**.

Do not begin writing implementation code yet. First produce an execution guide that I can follow one phase at a time.

The final system must support:

* Supabase PostgreSQL database.
* Supabase Authentication.
* A protected administrator account and admin interface.
* Admin login and logout.
* Admin-only routes.
* Product creation, editing, viewing, publishing, unpublishing, and deletion.
* Product category creation, editing, viewing, and deletion.
* Product image uploads.
* Supabase Storage for product images.
* Correct relationships between products, categories, users, and uploaded images.
* Secure Row Level Security policies.
* Server-side database operations where appropriate.
* Deployment on Vercel.
* Proper local and production environment variables.
* A maintainable project structure suitable for future additions such as orders, customers, inventory, payments, and analytics.

Your response must be based on the actual repository structure rather than generic assumptions.

Organize the implementation plan into clear phases.

## Phase 1: Existing Project Audit

Inspect the repository and report:

* Next.js version.
* Whether it uses the App Router or Pages Router.
* Whether it uses a `src` directory.
* Package manager.
* Current folder structure.
* Existing admin components or routes.
* Existing authentication logic.
* Existing API routes, Server Actions, Route Handlers, middleware, or proxy files.
* Existing environment-variable files and naming conventions.
* Existing product, category, image-upload, or database-related code.
* Current deployment configuration.
* Any code that needs to be removed, reused, or modified.

State the exact files and folders that will be affected.

## Phase 2: Supabase Project Creation and Dashboard Navigation

Give me precise navigation instructions through the current Supabase dashboard.

Explain exactly how to:

1. Create the Supabase project.
2. Choose the project name, organization, database password, and region.
3. Wait for project provisioning.
4. Find the project URL.
5. Find the publishable client key.
6. Find the server-side secret key.
7. Identify any older `anon` or `service_role` keys if the dashboard still displays them.
8. Find the PostgreSQL connection strings.
9. Determine which connection string is appropriate for a Vercel serverless application.
10. Find the SQL Editor.
11. Find the Table Editor.
12. Find Authentication settings.
13. Find URL Configuration.
14. Find Storage.
15. Find database logs, authentication logs, API logs, and security settings.

For every value, state:

* The exact Supabase dashboard menu path.
* What the key or value is used for.
* Whether it is safe to expose to the browser.
* The exact environment-variable name to use.
* Whether it belongs in `.env.local`, Vercel, or both.
* What must never be committed to Git.

## Phase 3: Environment Variables

Create a complete environment-variable plan for local development, preview deployments, and production.

Cover variables such as:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SITE_URL=
```

Only include variables that are genuinely needed for the architecture you recommend.

Explain:

* Which variables are public.
* Which variables are server-only.
* Which variables are required when using the Supabase JavaScript client.
* Which variables are required only if an ORM or direct PostgreSQL connection is introduced.
* How to place them in `.env.local`.
* How to add them in Vercel under Development, Preview, and Production.
* How to pull Vercel variables locally.
* How to prevent secrets from entering Git history.
* How to validate that all required variables exist at runtime.

Do not expose or invent real credentials. Use placeholders only.

## Phase 4: Database Architecture

Design the initial PostgreSQL schema for the admin product-management system.

At minimum, evaluate and define:

* `profiles`
* `categories`
* `products`
* `product_images`

Consider fields such as:

### Profiles

* `id`
* `full_name`
* `role`
* `is_active`
* `created_at`
* `updated_at`

### Categories

* `id`
* `name`
* `slug`
* `description`
* `image_url`
* `is_active`
* `created_by`
* `created_at`
* `updated_at`

### Products

* `id`
* `category_id`
* `name`
* `slug`
* `short_description`
* `description`
* `price`
* `compare_at_price`
* `currency`
* `sku`
* `stock_quantity`
* `is_featured`
* `is_active`
* `status`
* `created_by`
* `created_at`
* `updated_at`

### Product images

* `id`
* `product_id`
* `storage_path`
* `public_url` only if appropriate
* `alt_text`
* `display_order`
* `is_primary`
* `created_at`

Specify:

* Correct PostgreSQL data types.
* Primary keys.
* Foreign keys.
* Unique constraints.
* Check constraints.
* Indexes.
* Delete behavior.
* Timestamp handling.
* Slug-generation strategy.
* Product status values.
* Whether image URLs should be stored or generated from storage paths.
* Whether categories should support parent-child relationships now or later.
* Which fields are essential for the first implementation and which can wait.

Provide the recommended order for creating the tables and relationships.

## Phase 5: Authentication and Administrator Setup

Explain the safest practical admin-authentication approach for this project.

Cover:

* Creating the first admin user.
* Whether the admin should be created through the Supabase Authentication dashboard or an internal bootstrap script.
* Linking the Supabase Auth user to a `profiles` table.
* Assigning an `admin` role.
* Preventing normal users from promoting themselves.
* Protecting admin routes.
* Protecting Server Actions and Route Handlers.
* Verifying authorization on the server rather than trusting client state.
* Login, logout, session refresh, and redirect flow.
* Email-confirmation configuration.
* Password-reset flow.
* Production redirect URLs.
* Localhost redirect URLs.
* Vercel preview URLs.
* Handling inactive or disabled admin accounts.
* Preventing unauthorized access even when someone manually visits an admin URL.

Recommend whether the repository should use:

* Supabase Auth with `@supabase/ssr`.
* Next.js middleware or the current Next.js proxy mechanism.
* Server Components.
* Server Actions.
* Route Handlers.
* A combination of these.

Base the recommendation on the Next.js version found in the repository.

## Phase 6: Supabase Client Configuration

Define the exact client architecture required in this repository.

Identify the files that should be created, such as:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/admin.ts
src/lib/supabase/proxy.ts
src/proxy.ts
```

Adjust these paths to the actual repository.

For each client, explain:

* Where it can be imported.
* Which key it uses.
* Whether it runs in the browser or server.
* What actions it is allowed to perform.
* What actions it must never perform.
* How cookie-based sessions are handled.
* How session refresh works.
* How server authorization is validated.
* Why the secret-key client must never enter Client Components.

Also identify any existing files that should be replaced or refactored.

## Phase 7: Row Level Security

Create a complete RLS policy plan.

The intended behavior should be:

* Public visitors can read active categories.
* Public visitors can read published and active products.
* Public visitors can read permitted product-image records.
* Authenticated administrators can create, update, and delete categories.
* Authenticated administrators can create, update, and delete products.
* Authenticated administrators can manage product-image records.
* Normal authenticated users cannot access admin operations.
* Users cannot change their own role to `admin`.
* Sensitive profile information must not be publicly exposed.
* Server-side secret-key operations must be used only where genuinely necessary.

Explain:

* When RLS must be enabled.
* The order in which policies should be created.
* How to create a reusable `is_admin()` PostgreSQL function if appropriate.
* How to avoid recursive RLS policies.
* How to test every policy.
* Common mistakes that could expose admin data or permit unauthorized updates.

Provide policy intentions clearly, but keep actual SQL implementation for the coding phase unless a short example is necessary to clarify the design.

## Phase 8: Supabase Storage

Design the product-image storage setup.

Explain how to:

1. Create the storage bucket.
2. Decide between a public or private bucket.
3. Name the bucket.
4. Define the folder structure.
5. Upload product images from the admin interface.
6. Validate supported file types.
7. Enforce a maximum file size.
8. Generate safe filenames.
9. Store image metadata in PostgreSQL.
10. Set a primary product image.
11. Reorder product images.
12. Replace images.
13. Delete files from Storage when their database records are deleted.
14. Prevent orphaned files.
15. Display optimized images through Next.js.
16. Configure `next.config` for Supabase image domains when necessary.

Recommend a structure such as:

```text
product-images/
  products/
    {product-id}/
      {generated-filename}
```

Explain the Storage RLS policies required for public reading and admin-only uploads, updates, and deletions.

## Phase 9: Admin Interface Architecture

Review the existing interface and propose the minimum admin routes and components required.

At minimum, include:

```text
/admin/login
/admin
/admin/products
/admin/products/new
/admin/products/[id]
/admin/categories
/admin/categories/new
/admin/categories/[id]
```

Adapt these routes to the actual repository.

Define:

* Admin layout.
* Authentication guard.
* Sidebar or navigation.
* Dashboard summary.
* Product table.
* Category table.
* Product form.
* Category form.
* Image uploader.
* Loading states.
* Empty states.
* Success messages.
* Error messages.
* Delete confirmation.
* Form validation.
* Slug handling.
* Currency handling.
* Stock handling.
* Product publish status.
* Image previews.
* Server-side data fetching.
* Cache invalidation after mutations.
* Redirect behavior after create, update, and delete operations.

State which parts should be:

* Server Components.
* Client Components.
* Server Actions.
* Route Handlers.

Avoid unnecessary client-side fetching where server-side rendering is more appropriate.

## Phase 10: Backend Operations

Define the backend operations required for:

* Creating a category.
* Updating a category.
* Deleting a category.
* Listing categories.
* Creating a product.
* Updating a product.
* Publishing or unpublishing a product.
* Deleting a product.
* Uploading product images.
* Setting the primary image.
* Reordering images.
* Deleting product images.
* Validating the current administrator.
* Handling database errors.
* Handling storage upload failures.
* Rolling back partial operations where possible.

For every operation, specify:

* Entry point.
* Validation.
* Authentication check.
* Authorization check.
* Database action.
* Storage action.
* Cache revalidation.
* User-facing response.
* Logging requirement.
* Failure-handling strategy.

Recommend a validation library only if the repository does not already have one.

## Phase 11: Package and Dependency Plan

Inspect the installed dependencies and provide the exact minimum package additions required.

Potential packages may include:

```text
@supabase/supabase-js
@supabase/ssr
zod
```

Do not add packages that are already installed or unnecessary.

Provide the correct installation command using the repository’s existing package manager.

Explain which dependency is used for what.

## Phase 12: Local Development Workflow

Provide a summarized workflow for:

1. Installing dependencies.
2. Creating `.env.local`.
3. Starting the Next.js application.
4. Connecting to Supabase.
5. Running database SQL or migrations.
6. Creating the first admin.
7. Logging into the admin interface.
8. Creating a category.
9. Creating a product.
10. Uploading product images.
11. Confirming the product appears on the public storefront.
12. Testing unauthorized access.
13. Testing RLS.
14. Testing image deletion.
15. Testing invalid forms.
16. Testing inactive and unpublished products.

Include practical Supabase-dashboard checks after each major step.

## Phase 13: Vercel Deployment

Give exact deployment instructions for the existing repository.

Cover:

* Connecting the Git repository to Vercel.
* Framework detection.
* Build command.
* Output configuration.
* Root directory if this is a monorepo.
* Adding Supabase environment variables.
* Assigning environment variables to Development, Preview, and Production.
* Redeploying after environment-variable changes.
* Configuring the production domain.
* Adding the production URL to Supabase Auth.
* Supporting Vercel preview URLs safely.
* Verifying authentication cookies.
* Verifying image loading.
* Verifying Server Actions and Route Handlers.
* Checking Vercel function logs.
* Checking Supabase logs.
* Diagnosing build-time versus runtime errors.

## Phase 14: Security Checklist

Create a concise but complete security checklist covering:

* Secrets never exposed with `NEXT_PUBLIC_`.
* Secret keys never used in Client Components.
* RLS enabled on all exposed tables.
* Storage policies enabled.
* Server-side role verification.
* Input validation.
* File-type validation.
* File-size validation.
* SQL-injection protection.
* XSS protection.
* CSRF considerations.
* Safe redirects.
* Rate limiting for login and mutations.
* Admin audit logs.
* Database backups.
* Supabase database password storage.
* Git secret scanning.
* Vercel environment-variable separation.
* Avoiding publicly readable unpublished products.
* Avoiding normal users assigning themselves admin privileges.
* Avoiding accidental deletion of categories containing products.

## Phase 15: Testing and Acceptance Criteria

Create a final acceptance checklist proving that the implementation is complete.

It must verify that:

* The Supabase project is connected.
* Local environment variables work.
* Production environment variables work.
* Admin login works.
* Admin logout works.
* Sessions survive page refresh.
* Unauthorized users cannot access admin pages.
* Normal authenticated users cannot perform admin actions.
* Categories can be created, edited, and deleted.
* Products can be created, edited, published, unpublished, and deleted.
* Images can be uploaded, displayed, reordered, replaced, and deleted.
* Public visitors only see active and published content.
* RLS blocks direct unauthorized API requests.
* Storage policies block unauthorized uploads.
* The project builds successfully.
* The project deploys successfully to Vercel.
* No secrets appear in client bundles or Git.
* Errors are logged and displayed safely.

## Required Response Format

Your response must contain:

1. **Repository audit summary**
2. **Recommended architecture**
3. **Numbered implementation phases**
4. **Supabase dashboard navigation guide**
5. **Environment-variable matrix**
6. **Database-table summary**
7. **Authentication and RLS strategy**
8. **Exact files to create, edit, reuse, or delete**
9. **Dependency list**
10. **Local development checklist**
11. **Vercel deployment checklist**
12. **Security checklist**
13. **Testing and acceptance checklist**
14. **Recommended execution order**
15. **A final “Start Here” section containing only the first actionable phase**

Keep the guide summarized and easy to follow, but do not omit critical configuration, security, database, authentication, Storage, or deployment steps.

Do not give me a generic Supabase tutorial. Tailor every recommendation to the actual EKANA Cosmetics repository.

Do not modify any files during this planning stage.

Do not generate the full implementation yet.

Do not ask unnecessary questions. Where the repository provides enough information, make a clear technical decision and explain it briefly.

Use current stable Next.js, Supabase, and Vercel practices that are compatible with the versions detected in the repository.

At the end, tell me the exact first command or dashboard action I should perform to begin Phase 1.
