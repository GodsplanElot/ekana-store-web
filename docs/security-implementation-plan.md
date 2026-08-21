# Security Implementation Plan

This plan tracks the production hardening work for Ekana Store Web. It separates
controls that belong in application code from controls that must be configured
in Vercel, Supabase, Paystack, and operational process.

## Phase 1 - Already Implemented In Code

- **Payment callback spoofing:** the storefront does not trust the browser
  callback alone. `/api/payments/verify` verifies the Paystack reference
  server-side before changing order state.
- **Fake Paystack webhooks:** `/api/webhooks/paystack` validates the raw body
  with the `x-paystack-signature` HMAC SHA-512 digest before parsing.
- **Test/live key mixups:** the Paystack secret prefix determines the expected
  provider domain, and mismatched Paystack responses are rejected.
- **Amount or currency tampering:** payment reconciliation checks provider
  amount, currency, domain, reference, and local order state before fulfillment.
- **Duplicate callbacks or webhook replay:** payment transitions use idempotent
  references, event keys, and database reconciliation.
- **Oversized webhook payloads:** Paystack webhooks are capped at 1 MB.
- **Browser clickjacking and sniffing:** global security headers deny framing,
  disable MIME sniffing, limit referrer leakage, restrict browser permissions,
  and prevent API response caching.

## Phase 2 - Production Platform Controls

Configure these before enabling live checkout:

1. Add Vercel WAF/rate-limit rules for:
   - `POST /api/checkout`
   - `POST /api/payments/verify`
   - `POST /api/webhooks/paystack`
2. Use stricter bot protection on anonymous checkout routes because checkout
   temporarily reserves inventory.
3. Confirm HTTPS-only production domain and exact `NEXT_PUBLIC_APP_URL`.
4. Keep live `PAYSTACK_SECRET_KEY` scoped to Production only.
5. Keep test Paystack keys in Development and Preview only.
6. Confirm the Paystack Live webhook URL is:

   ```text
   https://<production-domain>/api/webhooks/paystack
   ```

7. Confirm Vercel Cron calls `/api/cron/payment-maintenance` with `CRON_SECRET`.
8. Confirm Supabase service-role keys are server-only and never exposed as
   `NEXT_PUBLIC_*`.

## Phase 3 - Next Code Hardening

- Add a nonce-based Content Security Policy. This should be implemented with
  request-time nonce generation so Next.js scripts, Vercel Analytics, images,
  Paystack redirects, and Supabase assets continue to work.
- Add structured security logging for rejected payment events without storing
  full provider payloads or secrets.
- Add automated route tests for security headers on public pages and API routes.
- Add tests for invalid webhook signatures, oversized webhook bodies, domain
  mismatch, amount mismatch, currency mismatch, duplicate webhook replay, and
  concurrent callback/webhook reconciliation.
- Add operational alerts for payment review states, repeated invalid signatures,
  stale pending payments, failed notification outbox rows, and webhook failures.

## Phase 4 - Attacks And Handling

- **XSS:** React escapes normal output; the next hardening step is nonce-based
  CSP and continued avoidance of unsafe HTML injection.
- **CSRF:** payment creation uses JSON POST with an idempotency key and server
  validation. Admin routes are authenticated through Supabase; add explicit
  origin checks for sensitive admin mutations if cross-site POST risk increases.
- **Clickjacking:** `X-Frame-Options: DENY` blocks framing.
- **MIME sniffing:** `X-Content-Type-Options: nosniff` prevents browsers from
  interpreting files as a different content type.
- **Data leakage through referrers:** `Referrer-Policy:
  strict-origin-when-cross-origin` limits path/query leakage to third parties.
- **Webhook replay:** idempotent event processing keeps duplicate webhook
  deliveries from causing duplicate side effects.
- **Payment tampering:** Paystack verification and reconciliation check amount,
  currency, reference, provider domain, and transaction identity.
- **Brute force and bot checkout abuse:** must be handled by Vercel WAF/rate
  limits because serverless in-memory rate limiting is not durable enough.
- **Secret exposure:** live secrets remain in Production environment variables
  only; exposed secrets must be rotated in Paystack and Vercel together.

## Phase 5 - Go-Live Evidence

Before production checkout is enabled, record:

- date and reviewer;
- deployment URL and commit;
- Vercel environment variable names and scopes, without values;
- Paystack mode and webhook URL;
- WAF/rate-limit rules;
- Supabase migration status;
- one successful low-value live order reference;
- webhook acknowledgment result;
- local order state;
- inventory movement;
- customer/admin notification result.
