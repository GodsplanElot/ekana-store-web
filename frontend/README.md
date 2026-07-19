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
configuration, catalogue APIs and pages fail closed. Empty catalogue states are
shown only after a successful query returns no products. There is no local
seed-product fallback.

Copy `.env.example` to `.env.local`, fill the relevant keys, and follow the
reviewed Supabase CLI workflow in [`supabase/README.md`](supabase/README.md).
The files in `db/migrations` are historical only and must not be rerun.

For payment configuration, test-mode validation, webhook setup, environment
separation, and live release controls, follow the tracked
[`Paystack setup and release guide`](../docs/paystack-setup.md).
