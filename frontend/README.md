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
- Supabase Storage for product images
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

The storefront catalogue is sourced only from Supabase. Without valid Supabase
configuration, catalogue APIs fail closed and storefront pages show no products.
There is no local seed-product fallback.

Copy `.env.example` to `.env.local`, fill the relevant keys, and apply every SQL
migration in `db/migrations` in filename order before using the app.
