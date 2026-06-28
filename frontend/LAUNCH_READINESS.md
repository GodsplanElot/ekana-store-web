# Ekana Store Launch Readiness

Use this checklist to track the remaining work needed to make the app production-ready against the client requirements document.

## 1. Client Content & Brand Inputs

- [ ] Confirm final product photos for hero, product cards, and category tiles.
- [ ] Confirm final support email address.
- [ ] Confirm final Instagram profile URL.
- [ ] Confirm final Pinterest profile URL.
- [ ] Confirm delivery locations, fees, delivery partner process, and pickup options if any.
- [ ] Confirm legal review of Privacy Policy and Terms and Conditions.

## 2. Static Frontend Alignment

- [ ] Confirm homepage order: hero, category cards, new/restocked products, brand promise, newsletter, footer.
- [ ] Confirm homepage CTAs: Shop Glosses, Shop Liners, and Shop Lashes.
- [ ] Confirm all shop categories are visible: Glosses, Lip Liners, Lashes, and Lash Trays.
- [ ] Confirm product cards show image, name, short description, price, and add/view action.
- [ ] Confirm product detail pages show image, description, features, shade/details, quantity, add to cart, delivery note, and related products.
- [ ] Confirm mobile menu includes Shop, About, Contact, Shipping & Returns, Privacy Policy, and Terms.
- [ ] Confirm footer includes Shop, About, Contact, Shipping & Returns, Privacy Policy, Instagram, and Pinterest.

## 3. Serverless Backend & Supabase

- [ ] Create or configure the Supabase project.
- [ ] Apply `db/migrations/0001_initial_backend.sql` in Supabase.
- [ ] Add production products into the `products` table.
- [ ] Confirm `GET /api/products` returns Supabase products when credentials are configured.
- [ ] Confirm checkout validates active products, prices, and inventory against Supabase.
- [ ] Confirm `orders` inserts work.
- [ ] Confirm `newsletter_subscribers` inserts work.
- [ ] Set Supabase environment variables locally and in production.

Required variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

## 4. Checkout & Paystack Confirmation

- [ ] Create or configure the Paystack account.
- [ ] Add `PAYSTACK_SECRET_KEY` locally and in production.
- [ ] Configure the Paystack callback URL.
- [ ] Configure the Paystack webhook URL.
- [ ] Test payment initialization.
- [ ] Test successful payment callback verification.
- [ ] Test failed payment handling.
- [ ] Test abandoned payment handling.
- [ ] Test webhook payment-status updates.
- [ ] Confirm cart clears only after local order submission without Paystack or confirmed paid callback.

Production webhook path:

```txt
/api/webhooks/paystack
```

## 5. Email & Support Messaging

- [ ] Configure Resend.
- [ ] Verify sender email or sending domain.
- [ ] Add Resend environment variables locally and in production.
- [ ] Test customer order confirmation email.
- [ ] Test admin order notification email.
- [ ] Confirm order emails mention the 48-hour damaged/incorrect-item reporting window.

Required variables:

```txt
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ORDER_NOTIFICATION_EMAIL=
```

## 6. Staff Admin Operations

- [ ] Apply staff and audit migrations, then create the first owner account.
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
- [ ] Configure production domain.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain.
- [ ] Add all production environment variables.
- [ ] Confirm secrets are not committed to Git.
- [ ] Update Paystack callback URL to the live domain.
- [ ] Update Paystack webhook URL to the live domain.
- [ ] Verify Supabase, Paystack, Resend, and Vercel Analytics work from production.

Core production variables:

```txt
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
RESEND_API_KEY=
```

## 10. Final Launch Approval

- [ ] Complete one full end-to-end test order.
- [ ] Complete one live Paystack test purchase or approved low-value live purchase.
- [ ] Confirm customer support process.
- [ ] Confirm order management routine.
- [ ] Confirm final legal/policy approval.
- [ ] Confirm final client approval before announcement.
