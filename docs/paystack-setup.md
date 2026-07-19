# Paystack Setup and Release Guide

This runbook covers Ekana's hosted Paystack redirect integration from local test
mode through production cutover. Complete each phase in order and record the
result; do not treat a browser redirect alone as proof of payment.

Official references:

- [Accept payments](https://paystack.com/docs/payments/accept-payments/)
- [Verify payments](https://paystack.com/docs/payments/verify-payments/)
- [Webhooks](https://paystack.com/docs/payments/webhooks/)
- [API authentication](https://paystack.com/docs/api/authentication/)
- [Integration payment-session timeout](https://paystack.com/docs/api/integration/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## Non-negotiable security rules

- **PAYSTACK_SECRET_KEY** is server-only. Never prefix it with **NEXT_PUBLIC_**,
  commit it, log it, or send it to the browser.
- This integration redirects to Paystack's hosted checkout. It does **not**
  need a public Paystack key because initialization happens on the server.
- Use the same mode-specific **PAYSTACK_SECRET_KEY** to authenticate Paystack
  API calls and validate the webhook's **x-paystack-signature** HMAC SHA-512
  digest.
- Test and live secrets must never cross environments.
- **PAYSTACK_CHECKOUT_ENABLED** controls only new transaction initialization.
  Keep verification, webhooks, and maintenance available when it is false.
- Calculate prices and totals on the server. Treat browser cart prices as
  display-only input.
- Never fulfill from the callback URL alone. Confirm the provider status,
  reference, amount in kobo, currency, and test/live domain first.

## Phase 0 - Legacy cutover and go/no-go check

The previous checkout generated references containing underscores and did not
create payment attempts or inventory reservations. Before deploying this
release, pause the old checkout and identify every old pending or paid order:

~~~sql
select reference, payment_status, total, paystack_reference, created_at
from public.orders
where reference like 'ekana\_%' escape '\'
  and payment_status in ('pending', 'paid')
order by created_at;
~~~

Reconcile each result directly against Paystack, including amount, currency,
mode, and final status. Do not auto-backfill confirmation evidence or inventory:
the old flow did not enforce those invariants. Existing paid orders require a
reviewed, per-order reconciliation and inventory decision before staff can
advance fulfilment. Do not deploy the new application while an old hosted
checkout remains payable. The new inbound parser accepts legacy underscore
references only so callbacks can be shown safely for manual review; it does not
silently trust or auto-fulfil them.

## Payment flow

~~~mermaid
sequenceDiagram
    autonumber
    actor Shopper
    participant Browser
    participant App as Ekana Next.js
    participant DB as Supabase
    participant Paystack

    Shopper->>Browser: Submit delivery details
    Browser->>App: POST /api/checkout + Idempotency-Key
    App->>DB: Validate cart and create/reserve order atomically
    App->>Paystack: Initialize transaction with server secret
    Paystack-->>App: authorization_url + reference
    App-->>Browser: Hosted checkout URL
    Browser->>Paystack: Enter payment details on Paystack

    par Callback verification
        Paystack-->>Browser: Redirect to /checkout?reference=...
        Browser->>App: POST /api/payments/verify
        App->>Paystack: Verify transaction by reference
        Paystack-->>App: status + amount + currency + domain
        App->>DB: Idempotent payment reconciliation
        App-->>Browser: Internal payment status
    and Signed webhook
        Paystack->>App: POST /api/webhooks/paystack
        App->>App: Validate raw-body HMAC signature
        App->>DB: Deduplicate and reconcile payment
        App-->>Paystack: 2xx after durable handling
    end
~~~

The callback improves customer experience; the webhook is the durable
server-to-server notification. Both paths must converge on the same idempotent
reconciliation rules so a duplicate or out-of-order event cannot double-charge,
double-decrement stock, resend confirmation, or regress a paid order.

## Phase 1 - Local test environment

1. In the Paystack dashboard, switch to **Test Mode** and obtain the test secret
   key. Keep it out of chat, screenshots, tickets, and Git.
2. Copy frontend/.env.example to frontend/.env.local.
3. Set test-only values:

   ~~~dotenv
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   PAYSTACK_CHECKOUT_ENABLED=true
   PAYSTACK_SECRET_KEY=sk_test_REPLACE_ME
   ~~~

4. Fill the required Supabase variables described in frontend/.env.example. Do
   not add a public Paystack key.
5. Confirm frontend/.env.local remains ignored by Git before continuing.
6. In the matching Paystack mode, set the integration payment-session timeout
   to exactly **1800 seconds** (30 minutes), or another nonzero value no greater
   than 1800. Never use **0**, which disables Paystack's timeout. The provider
   session must not outlive the application's 1800-second inventory reservation.

Paystack can redirect a local test browser back to localhost, but Paystack
cannot deliver webhooks to a private localhost address. Use a stable HTTPS
Preview deployment or a trusted HTTPS tunnel for end-to-end webhook testing.
When using a public test origin, set **NEXT_PUBLIC_APP_URL** to that exact origin
and restart or redeploy the app.

## Phase 2 - Local migration and application checks

Run these commands from frontend. Docker must be available for local Supabase:

~~~bash
pnpm install
pnpm supabase:local:start
pnpm supabase:local:reset
pnpm supabase:db:lint
pnpm supabase:verify
pnpm test:payments
pnpm lint
pnpm build
pnpm dev
~~~

Before applying anything to a linked remote Supabase project, also review:

~~~bash
pnpm supabase:migrations:list
pnpm supabase:remote:dry-run
~~~

Follow frontend/supabase/README.md for the reviewed migration workflow. A local
reset confirms migrations can build a clean database; it is not evidence that a
remote or production migration has run.

### Database-first Preview and Production rollout

The application calls the new payment RPCs on every checkout, so deploy the
additive database migration before the application code:

1. Back up the target database and confirm the linked Supabase project and
   environment.
2. Run `pnpm supabase:remote:dry-run` and review every statement.
3. Apply to Preview/staging first with
   `pnpm exec supabase db push --linked`.
4. Confirm migration history, the four payment tables, all seven payment RPCs,
   RLS, and service-role-only grants.
5. Run the complete Test Mode matrix against Preview.
6. Repeat the reviewed migration on Production while
   **PAYSTACK_CHECKOUT_ENABLED=false**.
7. Deploy the application only after the Production schema verification passes.

Never point a local CLI at Production merely to "try" the migration.

## Phase 3 - Hosted redirect integration

Verify the flow manually in Test Mode:

1. Add an in-stock product and submit the checkout form once.
2. Confirm the browser sends an **Idempotency-Key** and receives a
   Paystack-hosted HTTPS authorization URL.
3. Refresh the form and use browser back/forward navigation, then submit the
   same canonical cart and customer details again. Confirm the same request key
   is reused; changing the payload uses its separately bound key.
4. Confirm payment details are entered only on Paystack, never in Ekana fields.
5. Complete or abandon the hosted checkout.
6. On return, confirm the app calls the server verification endpoint using only
   a safe Paystack reference.
7. Confirm the cart clears only after the internal status is **paid**.

The server-side acceptance gate must require all of the following:

- the local order and provider reference match;
- Paystack reports a successful transaction;
- the provider amount equals the stored order total multiplied by 100;
- currency is **NGN**;
- the provider domain matches the configured mode (**test** or **live**);
- the transition is idempotent and inventory is committed at most once.

Pending, processing, ongoing, or queued payments remain pending. Failed or
abandoned attempts must not be fulfilled. Amount, currency, or transaction-ID
mismatches go to manual review and raise an operational alert. A reference or
test/live domain mismatch is hard rejected without mutating the order; correct
the deployment configuration before retrying.

## Phase 4 - Paystack dashboard webhook

Configure the mode-appropriate webhook in the Paystack dashboard:

~~~text
https://<public-app-domain>/api/webhooks/paystack
~~~

Examples of public-app-domain are a stable test/Preview alias during Test Mode
and the production custom domain during Live Mode. Do not use localhost or an
ephemeral deployment URL that changes after every push.

The application supplies its callback URL during transaction initialization
from **NEXT_PUBLIC_APP_URL**; the webhook URL is configured separately in the
Paystack dashboard.

Webhook handling requirements:

- read the raw request body before JSON parsing;
- compute HMAC SHA-512 with the same mode-specific **PAYSTACK_SECRET_KEY**;
- compare the digest with **x-paystack-signature** using a constant-time,
  equal-length comparison;
- reject missing, malformed, or invalid signatures;
- validate event shape, reference, amount, currency, and domain;
- deduplicate repeated events and make side effects idempotent;
- return a 2xx response only after the event is durably recorded or reconciled;
- return a retryable non-2xx response for transient database failures.

Paystack retries webhooks that are not acknowledged. Keep webhook verification
and reconciliation enabled even when new checkout initialization is paused.

## Phase 5 - Test-mode verification matrix

Do not mark this phase complete until each observed result has been recorded.

| Scenario | Expected result |
| --- | --- |
| Successful hosted payment | Exact amount/currency/reference becomes paid once; cart clears |
| Declined or failed payment | Order remains unpaid; cart remains |
| Abandoned checkout | Safe retry path; no fulfillment or paid message |
| Pending/processing method | Pending UI; later webhook or verification can advance it |
| Callback without webhook | Server verification reconciles the order |
| Webhook without callback | Order reconciles even if the shopper never returns |
| Duplicate webhook replay | One event effect, one inventory commit, one confirmation |
| Concurrent callback and webhook | Same final state with no duplicate side effects |
| Invalid or missing signature | Rejected without changing order state |
| Amount/currency/transaction mismatch | Manual review; never fulfilled |
| Reference or test/live domain mismatch | Hard rejected; fix the deployment configuration; no order state mutation |
| Browser total differs from server total | Reservation released; no redirect until cart is refreshed |
| Double-click or network retry | Same request key; no duplicate order |
| Refresh or back navigation | Identical canonical checkout details recover the same session-scoped request key |
| Initialization timeout | Outcome stays recoverable; retry cannot create a duplicate |
| Last-unit concurrency | At most one valid reservation/commit; stock never goes negative |
| Unknown verification reference | Generic safe response; no provider data leak |
| Paid transaction reversed | Fulfilment blocked; review alert; captured stock is not auto-restocked |
| Unpaid transaction reversed | Reservation released; order remains non-fulfillable |
| Failed notification delivery | Outbox row retries through the maintenance job |
| Admin delivery fails after customer delivery | Customer row stays sent; independent admin row retries and is not marked sent |

For each test, record the date, deployment, sanitized order/reference, expected
state, actual state, webhook result, inventory result, and reviewer. Never paste
secret keys or full provider payloads into the record.

## Phase 6 - Notifications, maintenance, and environment separation

Payment state commits before email delivery. Configure these server-only
variables before testing confirmations and review alerts:

~~~dotenv
RESEND_API_KEY=re_REPLACE_ME
RESEND_FROM_EMAIL=Ekana Cosmetics <orders@your-verified-domain.example>
ORDER_NOTIFICATION_EMAIL=payments@your-domain.example
CRON_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS
~~~

**ORDER_NOTIFICATION_EMAIL** is required for live admin payment confirmations
and operational review alerts.
Customer confirmation/review messages and admin confirmation/review alerts use
separate outbox rows and dedupe keys. Admin rows persist only the sentinel
`ORDER_NOTIFICATION_EMAIL`; the configured address is resolved from the
environment at delivery time. A thrown Resend call or a Resend error leaves
that individual row retryable instead of marking it sent.

The scheduled `/api/cron/payment-maintenance` route is protected by
**CRON_SECRET**, reclaims expired inventory reservations, and drains due
notification retries. The repository schedules it daily at 03:00 UTC so it
remains Hobby-compatible. Daily scheduling is a recovery backstop, not a
low-latency notification guarantee. On a paid plan, use a more frequent cadence
(for example every five minutes) after reviewing the plan's cron, function, and
email limits. Test the route with a Bearer token without printing that token in
logs.

For this repository, set the Vercel Project **Root Directory** to `frontend` and
confirm that `frontend/vercel.json` is the active build configuration. The root
`vercel.json` mirrors the maintenance cron for the existing root-linked project,
but that does not replace verifying the actual Root Directory, output, and cron
in the Vercel dashboard after deployment.

Use Vercel's scoped environment variables and redeploy after every change:

| Scope | NEXT_PUBLIC_APP_URL | PAYSTACK_CHECKOUT_ENABLED | PAYSTACK_SECRET_KEY |
| --- | --- | --- | --- |
| Local | http://localhost:3000 or trusted test tunnel | true while testing | Test secret only |
| Preview | Stable HTTPS Preview/staging alias | true after Preview migration | Test secret only |
| Production | Production HTTPS custom domain | false until final cutover | Live secret only at approved cutover |

Also keep Preview connected to non-production Supabase data. Do not place the
live Paystack secret in Development or Preview, and do not point the live
Paystack webhook at a test-secret deployment. A changing Vercel deployment URL
is unsuitable for callbacks and webhooks; use a stable alias.

Before enabling checkout, configure a platform/WAF rate limit and bot control
for `POST /api/checkout` and `POST /api/payments/verify`. Checkout is anonymous
and temporarily reserves stock, so this is a live-release requirement rather
than an optional optimization. Record and review the deployed Vercel WAF rules;
the repository, tests, and build cannot prove that this external control exists.

Before cutover, inspect the deployed environment variable **names and scopes**
without printing values. Confirm both the app's API authentication and webhook
HMAC validation use the secret for the same Paystack mode.

## Phase 7 - Live cutover

Go live only after the Test Mode matrix and application checks are reviewed:

1. Complete Paystack business activation/KYC, settlement account setup, and
   required policy or support details. Confirm the dashboard can enter Live
   Mode and the production integration accepts the live secret.
2. Confirm the production domain is HTTPS and **NEXT_PUBLIC_APP_URL** is exact.
3. Add the live secret, notification variables, and **CRON_SECRET** to Vercel
   **Production** only; keep **PAYSTACK_CHECKOUT_ENABLED=false**.
4. In Paystack Live Mode, set:

   ~~~text
   https://<production-domain>/api/webhooks/paystack
   ~~~

5. Reconfirm the Paystack payment-session timeout is nonzero and no greater
   than the 1800-second reservation TTL.
6. Confirm the database-first rollout, webhook, maintenance cron, WAF controls,
   and review-alert inbox, then set **PAYSTACK_CHECKOUT_ENABLED=true** and
   redeploy Production.
7. Perform one approved low-value live purchase.
8. Verify the provider result, local paid state, inventory movement, webhook
   acknowledgment, customer/admin notification, and fulfillment gate.
9. If approved by the business, exercise the refund procedure and verify its
   final provider state before marking the order refunded.
10. Monitor initialization errors, invalid signatures, stale pending payments,
   reconciliation mismatches, paid-without-inventory exceptions, duplicates,
   refunds, and disputes.

Checkout traffic opportunistically calls
`release_expired_payment_reservations` before quoting a new cart. Supplement
this traffic-driven cleanup with a scheduled, service-role-only call to
`release_expired_payment_reservations` in high-volume production and in
low-traffic deployments where expired reservations must be reclaimed
predictably.

No step above is considered passed merely because this guide exists or a build
completes.

At launch, allow only one refund operation per transaction. A second processed
partial refund is deliberately moved to manual review because the application
does not infer cumulative refund totals from individual webhook amounts.
Reconcile multiple-partial cases directly in Paystack before any local
resolution.

## Phase 8 - Rollback and incident response

Rollback stops new risk without abandoning payments already in flight:

1. Set **PAYSTACK_CHECKOUT_ENABLED=false** and redeploy to pause new
   initialization without disabling reconciliation.
2. **Do not** delete **PAYSTACK_SECRET_KEY**, disable the webhook, or disable
   verification; those are required to reconcile existing payments.
3. Keep the database expansion in place. Avoid destructive migration rollback
   while old and new payment events may still arrive.
4. Reconcile every reference created before the pause directly with Paystack.
5. Release inventory only for transactions confirmed terminal and unpaid.
6. Escalate amount/currency/reference mismatches and paid-but-unfulfillable
   orders; refund only through the approved refund workflow.
7. If a secret may be exposed, rotate it in Paystack and Vercel together, then
   redeploy and verify webhook signatures with the replacement secret.
8. Re-enable checkout only after the cause is fixed and the Test Mode regression
   matrix is reviewed.

Immediate rollback triggers include a secret leak, acceptance of an invalid
signature, paid orders with mismatched amounts, duplicate orders or inventory
commits, negative stock, sustained webhook failures, or inability to reconcile
provider and local payment states.

Rolling back application code cannot reverse an external charge. Provider
reconciliation and, when appropriate, an audited refund remain mandatory.
