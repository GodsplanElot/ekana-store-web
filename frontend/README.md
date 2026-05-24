# Ekana Store Web

Next.js storefront prototype for Ekana's Cosmetic. The app includes a static product catalog, product detail pages, a localStorage-backed cart, a cart drawer, and a clearly marked demo checkout flow.

## Stack

- Next.js App Router
- React 19
- Tailwind CSS
- shadcn/Radix UI components
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

This is a frontend prototype. Product data lives in `lib/products.ts`, cart state is stored in the browser, and checkout does not process real payments or create live orders.
