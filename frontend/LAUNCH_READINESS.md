# Ekana Store Launch Readiness

Use this checklist to track the remaining work needed to make the app production-ready against the client requirements document.

## 1. Client Content & Brand Inputs

- [ ] Confirm final product photos for hero, product cards, and category tiles.
- [ ] Confirm final support email address.
- [ ] Confirm final Instagram profile URL.
- [ ] Confirm final Pinterest profile URL.
- [ ] Confirm delivery locations, fees, delivery partner process, and pickup options if any.
- [ ] Confirm legal review of Privacy Policy and Terms and Conditions.

## 2. Storefront Alignment

- [ ] Confirm homepage order: hero, category cards, new/restocked products, brand promise, newsletter, footer.
- [ ] Confirm the homepage shop CTA opens the catalogue.
- [ ] Confirm category cards and shop filters are derived from active Supabase products.
- [ ] Confirm product cards show image, name, short description, price, and add/view action.
- [ ] Confirm product detail pages show image, description, features, shade/details, quantity, add to cart, delivery note, and related products.
- [ ] Confirm mobile menu includes Shop, About, Contact, Shipping & Returns, Privacy Policy, and Terms.
- [ ] Confirm footer includes Shop, About, Contact, Shipping & Returns, Privacy Policy, Instagram, and Pinterest.

## 3. Serverless Backend & Supabase

- [ ] Create or configure the Supabase project.
- [ ] Follow `supabase/README.md`; confirm the CLI migration history and hosted dry run are clean.
- [ ] From `frontend`, run `pnpm supabase:verify` and confirm every check passes.
- [ ] Add production products into the `products` table.
- [ ] Confirm `GET /api/products` returns Supabase products when credentials are configured.
- [ ] Confirm checkout validates active products, prices, and inventory against Supabase.
- [ ] Confirm `orders` inserts work.
- [ ] Confirm `newsletter_subscribers` inserts work.
- [ ] Set Supabase environment variables locally and in production.

Required variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
```

## 4. Checkout & Paystack Confirmation

- [ ] Create or configure the Paystack account.
- [ ] Complete activation/KYC before Live Mode and confirm the live integration accepts the production secret.
- [ ] Add the mode-correct server-only `PAYSTACK_SECRET_KEY`; do not add a public Paystack key.
- [ ] Keep `PAYSTACK_CHECKOUT_ENABLED=false` until the database-first rollout and live gates pass.
- [ ] Set Paystack's integration payment-session timeout to exactly 1800 seconds, or another nonzero value no greater than the application's 1800-second inventory reservation TTL; never use 0 because it disables the provider timeout.
- [ ] Confirm `NEXT_PUBLIC_APP_URL` is the exact origin used to construct callback URLs.
- [ ] Configure the Paystack webhook URL.
- [ ] Test payment initialization.
- [ ] Confirm identical canonical cart/customer details reuse the session-scoped idempotency key across refresh and back navigation.
- [ ] Test successful payment callback verification.
- [ ] Test failed payment handling.
- [ ] Test abandoned payment handling.
- [ ] Test webhook payment-status updates.
- [ ] Confirm the cart clears only after the internal payment status is `paid`; local order creation, redirect, pending, failed, and review states must keep it.
- [ ] Deploy and verify WAF rate-limit/bot controls for `POST /api/checkout` and `POST /api/payments/verify`; a repository build cannot prove this external gate.
- [ ] Complete the phase-by-phase checks in `../docs/paystack-setup.md`.

Production webhook path:

```txt
/api/webhooks/paystack
```

Required variables:

```txt
NEXT_PUBLIC_APP_URL=
PAYSTACK_CHECKOUT_ENABLED=false
PAYSTACK_SECRET_KEY=
CRON_SECRET=
```

## 5. Email & Support Messaging

- [ ] Configure Resend.
- [ ] Verify sender email or sending domain.
- [ ] Add Resend environment variables locally and in production.
- [ ] Test customer order confirmation email.
- [ ] Test customer confirmation and review emails as independent outbox rows.
- [ ] Test admin confirmation and payment-review alerts as independent outbox rows.
- [ ] Confirm a Resend error or throw retries only the failed row and never marks it sent.
- [ ] Confirm `ORDER_NOTIFICATION_EMAIL` is resolved at delivery time; no actual admin address is persisted in admin outbox rows.
- [ ] Confirm order emails mention the 48-hour damaged/incorrect-item reporting window.

Required variables:

```txt
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ORDER_NOTIFICATION_EMAIL=
```

## 6. Staff Admin Operations

- [ ] Confirm the CLI migration history is current, then create the first owner account.
- [ ] Test product creation, image upload, editing, and deactivation in `/admin/products`.
- [ ] Test order review and filtering in `/admin/orders`.
- [ ] Test valid fulfilment transitions and staff role restrictions.
- [ ] Document the admin operating routine for product updates, restocks, and order fulfillment.

Admin variables:

```txt
```

## 7. Analytics & Monitoring

- [ ] Confirm Vercel Analytics is enabled in production.
- [ ] Confirm product view events.
- [ ] Confirm add-to-cart events.
- [ ] Confirm checkout attempt events.
- [ ] Confirm order confirmation events.
- [ ] Confirm newsletter signup events.

## 8. Mobile QA & Accessibility

- [ ] Test home page on common iPhone and Android widths.
- [ ] Test shop page and category filters on mobile.
- [ ] Test product detail page sticky add-to-cart action.
- [ ] Test cart drawer quantity updates and removal.
- [ ] Test checkout autofill fields.
- [ ] Test newsletter success and error states.
- [ ] Test FAQ accordion and all policy pages.
- [ ] Confirm readable contrast, descriptive image alt text, and keyboard-accessible controls.
- [ ] Optimize/compress product and banner images.

Verification commands:

```bash
pnpm.cmd lint
pnpm.cmd build
```

## 9. Production Deployment

- [ ] Deploy to Vercel or another Next.js-compatible serverless host.
- [ ] Set Vercel Project Root Directory to `frontend`; verify the deployed build output and `/api/cron/payment-maintenance` schedule in the dashboard.
- [ ] Keep the daily Hobby-compatible cron as a recovery backstop; on paid plans choose and verify a faster retry cadence within plan/function/email limits.
- [ ] Configure production domain.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain.
- [ ] Add all production environment variables.
- [ ] Confirm secrets are not committed to Git.
- [ ] Confirm initialized transactions contain the exact live-domain callback URL.
- [ ] Update Paystack webhook URL to the live domain.
- [ ] Verify Supabase, Paystack, Resend, and Vercel Analytics work from production.

Core production variables:

```txt
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
PAYSTACK_CHECKOUT_ENABLED=false
PAYSTACK_SECRET_KEY=
CRON_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ORDER_NOTIFICATION_EMAIL=
```

## 10. Final Launch Approval

- [ ] Complete one full end-to-end test order.
- [ ] Complete one live Paystack test purchase or approved low-value live purchase.
- [ ] Confirm customer support process.
- [ ] Confirm order management routine.
- [ ] Confirm final legal/policy approval.
- [ ] Confirm final client approval before announcement.
