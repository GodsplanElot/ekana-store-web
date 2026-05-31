# Ekana Store Web

Next.js storefront for Ekana Cosmetics. The app includes a mobile-first product catalog, product detail pages, localStorage cart persistence, cart drawer, newsletter signup, checkout order capture, Paystack payment initialization, and Supabase-backed admin/order APIs.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS
- shadcn/Radix UI components
- Supabase for Postgres/Auth-backed backend data
- Paystack for payments
- Resend for email notifications
- Cloudinary-ready image storage configuration
- pnpm

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm lint
pnpm build
pnpm start
```

## Current Scope

The app runs without service credentials by using the seed catalog in `lib/products.ts`. When environment variables are configured, API routes persist newsletter signups and orders to Supabase, initialize Paystack payments, and send order emails through Resend.

Copy `.env.example` to `.env.local` and fill the relevant keys before enabling live backend behavior. Apply `db/migrations/0001_initial_backend.sql` to Supabase before using the backend tables.
