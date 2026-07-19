begin;

-- Payment lifecycle columns are additive so existing orders and references remain valid.
alter table public.orders
  add column if not exists payment_currency text not null default 'NGN',
  add column if not exists paid_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmation_source text,
  add column if not exists payment_confirmation_queued_at timestamptz,
  add column if not exists payment_confirmation_sent_at timestamptz,
  add column if not exists payment_failure_reason text;

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payment_status_check'
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (
        payment_status = any (
          array[
            'pending'::text,
            'processing'::text,
            'paid'::text,
            'failed'::text,
            'abandoned'::text,
            'cancelled'::text,
            'refunded'::text,
            'partially_refunded'::text,
            'refund_pending'::text,
            'reversed'::text,
            'review'::text
          ]
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payment_currency_check'
  ) then
    alter table public.orders
      add constraint orders_payment_currency_check
      check (payment_currency = 'NGN') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payment_confirmation_source_check'
  ) then
    alter table public.orders
      add constraint orders_payment_confirmation_source_check
      check (
        payment_confirmation_source is null
        or payment_confirmation_source = any (
          array['webhook'::text, 'verification'::text, 'reconciliation'::text]
        )
      ) not valid;
  end if;
end
$constraints$;

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null default 'paystack',
  provider_domain text not null,
  reference text not null,
  idempotency_key text not null,
  request_fingerprint text not null,
  expected_amount_kobo bigint not null,
  currency text not null default 'NGN',
  status text not null default 'created',
  provider_status text,
  provider_transaction_id text,
  initialization_claim_token text,
  initialization_claimed_at timestamptz,
  initialization_claim_expires_at timestamptz,
  authorization_url text,
  access_code text,
  gateway_response text,
  failure_code text,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  initialized_at timestamptz,
  paid_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_reference_key unique (reference),
  constraint payment_attempts_idempotency_key_key unique (idempotency_key),
  constraint payment_attempts_provider_check check (provider = 'paystack'),
  constraint payment_attempts_reference_check check (reference ~ '^[A-Za-z0-9.=-]{1,100}$'),
  constraint payment_attempts_idempotency_key_check check (char_length(btrim(idempotency_key)) between 8 and 200),
  constraint payment_attempts_request_fingerprint_check check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint payment_attempts_expected_amount_check check (expected_amount_kobo > 0),
  constraint payment_attempts_currency_check check (currency = 'NGN'),
  constraint payment_attempts_status_check check (
    status = any (
      array[
        'created'::text,
        'initializing'::text,
        'initialized'::text,
        'pending'::text,
        'processing'::text,
        'succeeded'::text,
        'failed'::text,
        'abandoned'::text,
        'cancelled'::text,
        'released'::text,
        'review'::text,
        'refund_pending'::text,
        'refunded'::text,
        'partially_refunded'::text
      ]
    )
  ),
  constraint payment_attempts_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint payment_attempts_claim_token_check check (
    initialization_claim_token is null
    or char_length(initialization_claim_token) between 16 and 200
  ),
  constraint payment_attempts_provider_domain_check check (
    provider_domain = any (array['test'::text, 'live'::text])
  )
);

create unique index payment_attempts_provider_transaction_key
  on public.payment_attempts (provider, provider_domain, provider_transaction_id)
  where provider_transaction_id is not null;
create index payment_attempts_order_created_idx
  on public.payment_attempts (order_id, created_at desc);
create index payment_attempts_status_expiry_idx
  on public.payment_attempts (status, expires_at)
  where status <> 'succeeded';

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  product_id text not null references public.products(id) on delete restrict,
  quantity integer not null,
  status text not null default 'reserved',
  expires_at timestamptz not null,
  captured_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_reservations_order_product_key unique (order_id, product_id),
  constraint inventory_reservations_quantity_check check (quantity > 0),
  constraint inventory_reservations_status_check check (
    status = any (array['reserved'::text, 'captured'::text, 'released'::text])
  ),
  constraint inventory_reservations_state_timestamps_check check (
    (status = 'reserved' and captured_at is null and released_at is null)
    or (status = 'captured' and captured_at is not null and released_at is null)
    or (status = 'released' and captured_at is null and released_at is not null)
  )
);

create index inventory_reservations_attempt_status_idx
  on public.inventory_reservations (payment_attempt_id, status);
create index inventory_reservations_expiry_idx
  on public.inventory_reservations (expires_at)
  where status = 'reserved';

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  provider text not null default 'paystack',
  provider_domain text not null,
  event_key text not null,
  event_type text not null,
  event_source text not null,
  reference text not null,
  provider_transaction_id text,
  provider_status text,
  amount_kobo bigint,
  currency text,
  outcome text not null,
  outcome_reason text,
  summary jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now(),
  constraint payment_events_event_key_key unique (event_key),
  constraint payment_events_provider_check check (provider = 'paystack'),
  constraint payment_events_provider_domain_check check (
    provider_domain = any (array['test'::text, 'live'::text])
  ),
  constraint payment_events_event_key_check check (char_length(btrim(event_key)) between 1 and 300),
  constraint payment_events_event_type_check check (char_length(btrim(event_type)) between 1 and 120),
  constraint payment_events_event_source_check check (
    event_source = any (
      array['webhook'::text, 'verification'::text, 'reconciliation'::text, 'system'::text, 'admin'::text]
    )
  ),
  constraint payment_events_amount_check check (amount_kobo is null or amount_kobo > 0),
  constraint payment_events_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint payment_events_outcome_check check (
    outcome = any (array['applied'::text, 'duplicate'::text, 'ignored'::text, 'rejected'::text, 'error'::text])
  ),
  constraint payment_events_summary_object_check check (jsonb_typeof(summary) = 'object')
);

create index payment_events_reference_received_idx
  on public.payment_events (reference, received_at desc);
create index payment_events_attempt_received_idx
  on public.payment_events (payment_attempt_id, received_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete restrict,
  channel text not null default 'email',
  template_key text not null,
  recipient text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_outbox_dedupe_key_key unique (dedupe_key),
  constraint notification_outbox_channel_check check (channel = 'email'),
  constraint notification_outbox_template_key_check check (
    template_key = any (
      array[
        'payment_confirmation'::text,
        'payment_review'::text,
        'admin_payment_confirmation'::text,
        'admin_payment_review'::text
      ]
    )
  ),
  constraint notification_outbox_recipient_check check (
    (
      template_key in ('payment_confirmation', 'payment_review')
      and char_length(btrim(recipient)) between 3 and 320
      and recipient <> 'ORDER_NOTIFICATION_EMAIL'
    )
    or (
      template_key in ('admin_payment_confirmation', 'admin_payment_review')
      and recipient = 'ORDER_NOTIFICATION_EMAIL'
    )
  ),
  constraint notification_outbox_status_check check (
    status = any (array['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text, 'dead'::text])
  ),
  constraint notification_outbox_attempt_count_check check (
    attempt_count >= 0 and max_attempts > 0 and attempt_count <= max_attempts
  ),
  constraint notification_outbox_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint notification_outbox_sent_state_check check (
    (status = 'sent' and sent_at is not null)
    or (status <> 'sent')
  )
);

create index notification_outbox_delivery_idx
  on public.notification_outbox (status, next_attempt_at, created_at)
  where status in ('pending', 'failed');

create or replace function private.enqueue_payment_review_notifications(
  p_order_id uuid,
  p_payment_attempt_id uuid,
  p_review_reason text
)
returns void
language sql
security definer
set search_path = ''
as $function$
  insert into public.notification_outbox (
    order_id,
    payment_attempt_id,
    channel,
    template_key,
    recipient,
    dedupe_key,
    payload
  )
  select
    orders.id,
    attempt.id,
    'email',
    notification.template_key,
    notification.recipient,
    notification.dedupe_key,
    jsonb_build_object(
      'reference', orders.reference,
      'customerName', orders.customer_name,
      'total', orders.total,
      'totalKobo', attempt.expected_amount_kobo,
      'currency', attempt.currency,
      'paidAt', orders.paid_at,
      'reviewReason', p_review_reason
    )
  from public.orders as orders
  join public.payment_attempts as attempt
    on attempt.id = p_payment_attempt_id
   and attempt.order_id = orders.id
  cross join lateral (
    values
      ('payment_review'::text, orders.customer_email, 'payment-review:' || orders.id::text),
      ('admin_payment_review'::text, 'ORDER_NOTIFICATION_EMAIL'::text, 'payment-review:' || orders.id::text || ':admin')
  ) as notification(template_key, recipient, dedupe_key)
  where orders.id = p_order_id
  on conflict (dedupe_key) do nothing;
$function$;

create or replace function private.enqueue_payment_confirmation_notifications(
  p_order_id uuid,
  p_payment_attempt_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $function$
  insert into public.notification_outbox (
    order_id,
    payment_attempt_id,
    channel,
    template_key,
    recipient,
    dedupe_key,
    payload
  )
  select
    orders.id,
    attempt.id,
    'email',
    notification.template_key,
    notification.recipient,
    notification.dedupe_key,
    jsonb_build_object(
      'reference', orders.reference,
      'customerName', orders.customer_name,
      'total', orders.total,
      'totalKobo', attempt.expected_amount_kobo,
      'currency', attempt.currency,
      'paidAt', orders.paid_at
    )
  from public.orders as orders
  join public.payment_attempts as attempt
    on attempt.id = p_payment_attempt_id
   and attempt.order_id = orders.id
  cross join lateral (
    values
      ('payment_confirmation'::text, orders.customer_email, 'payment-confirmation:' || orders.id::text),
      ('admin_payment_confirmation'::text, 'ORDER_NOTIFICATION_EMAIL'::text, 'payment-confirmation:' || orders.id::text || ':admin')
  ) as notification(template_key, recipient, dedupe_key)
  where orders.id = p_order_id
  on conflict (dedupe_key) do nothing;
$function$;

create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function private.set_updated_at();

create trigger inventory_reservations_set_updated_at
before update on public.inventory_reservations
for each row execute function private.set_updated_at();

create trigger notification_outbox_set_updated_at
before update on public.notification_outbox
for each row execute function private.set_updated_at();

alter table public.payment_attempts enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payment_events enable row level security;
alter table public.notification_outbox enable row level security;

revoke all privileges on table public.payment_attempts from public, anon, authenticated;
revoke all privileges on table public.inventory_reservations from public, anon, authenticated;
revoke all privileges on table public.payment_events from public, anon, authenticated;
revoke all privileges on table public.notification_outbox from public, anon, authenticated;

grant all privileges on table public.payment_attempts to service_role;
grant all privileges on table public.inventory_reservations to service_role;
grant all privileges on table public.payment_events to service_role;
grant all privileges on table public.notification_outbox to service_role;

create or replace function public.create_payment_order(
  p_reference text,
  p_idempotency_key text,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_city text,
  p_order_notes text,
  p_delivery_fee integer,
  p_items jsonb,
  p_provider_domain text,
  p_reservation_ttl_seconds integer default 1800
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_reference text := btrim(p_reference);
  v_idempotency_key text := btrim(p_idempotency_key);
  v_customer_email text := lower(btrim(p_customer_email));
  v_customer_name text := btrim(p_customer_name);
  v_customer_phone text := btrim(p_customer_phone);
  v_delivery_address text := btrim(p_delivery_address);
  v_delivery_city text := btrim(p_delivery_city);
  v_provider_domain text := lower(btrim(p_provider_domain));
  v_requested_items jsonb;
  v_order_items jsonb;
  v_request_fingerprint text;
  v_unavailable_products text;
  v_subtotal_bigint bigint;
  v_subtotal integer;
  v_expected_delivery_fee integer;
  v_total integer;
  v_order_id uuid;
  v_attempt_id uuid;
  v_expires_at timestamptz;
  v_existing record;
begin
  if v_reference is null or v_reference !~ '^[A-Za-z0-9.=-]{1,100}$' then
    raise exception using errcode = '22023', message = 'payment_reference_invalid';
  end if;
  if v_idempotency_key is null or char_length(v_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'idempotency_key_invalid';
  end if;
  if v_customer_email is null or char_length(v_customer_email) not between 3 and 320 or position('@' in v_customer_email) <= 1 then
    raise exception using errcode = '22023', message = 'customer_email_invalid';
  end if;
  if v_customer_name is null or char_length(v_customer_name) not between 1 and 240
    or v_customer_phone is null or char_length(v_customer_phone) not between 5 and 50
    or v_delivery_address is null or char_length(v_delivery_address) not between 3 and 1000
    or v_delivery_city is null or char_length(v_delivery_city) not between 2 and 160 then
    raise exception using errcode = '22023', message = 'customer_details_invalid';
  end if;
  if p_delivery_fee is null or p_delivery_fee < 0 then
    raise exception using errcode = '22023', message = 'delivery_fee_invalid';
  end if;
  if v_provider_domain is null or v_provider_domain not in ('test', 'live') then
    raise exception using errcode = '22023', message = 'provider_domain_invalid';
  end if;
  if p_reservation_ttl_seconds is null
    or p_reservation_ttl_seconds not between 300 and 86400 then
    raise exception using errcode = '22023', message = 'reservation_ttl_invalid';
  end if;
  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'checkout_items_invalid';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as element(value)
    where jsonb_typeof(element.value) <> 'object'
      or not (element.value ? 'productId')
      or not (element.value ? 'quantity')
      or jsonb_typeof(element.value -> 'productId') <> 'string'
      or jsonb_typeof(element.value -> 'quantity') <> 'number'
      or char_length(btrim(element.value ->> 'productId')) < 1
      or (element.value ->> 'quantity') !~ '^[0-9]+$'
      or (element.value ->> 'quantity')::integer < 1
  ) then
    raise exception using errcode = '22023', message = 'checkout_items_invalid';
  end if;

  select jsonb_agg(
    jsonb_build_object('productId', requested.product_id, 'quantity', requested.quantity)
    order by requested.product_id
  )
  into v_requested_items
  from (
    select
      btrim(element.value ->> 'productId') as product_id,
      sum((element.value ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as element(value)
    group by btrim(element.value ->> 'productId')
  ) as requested;

  if exists (
    select 1
    from jsonb_to_recordset(v_requested_items) as requested("productId" text, quantity integer)
    where requested.quantity > 20
  ) then
    raise exception using errcode = '22023', message = 'product_purchase_limit_exceeded';
  end if;

  v_request_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'reference', v_reference,
          'customerEmail', v_customer_email,
          'customerName', v_customer_name,
          'customerPhone', v_customer_phone,
          'deliveryAddress', v_delivery_address,
          'deliveryCity', v_delivery_city,
          'orderNotes', nullif(btrim(p_order_notes), ''),
          'deliveryFee', p_delivery_fee,
          'providerDomain', v_provider_domain,
          'items', v_requested_items
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_idempotency_key, 0));

  select
    attempt.id as attempt_id,
    attempt.order_id,
    attempt.reference,
    attempt.request_fingerprint,
    attempt.expected_amount_kobo,
    attempt.currency,
    attempt.provider_domain,
    attempt.status as attempt_status,
    attempt.expires_at,
    attempt.authorization_url,
    attempt.access_code,
    orders.payment_status,
    orders.subtotal,
    orders.delivery_fee,
    orders.total,
    orders.items
  into v_existing
  from public.payment_attempts as attempt
  join public.orders as orders on orders.id = attempt.order_id
  where attempt.idempotency_key = v_idempotency_key
  for update of attempt, orders;

  if found then
    if v_existing.reference <> v_reference
      or v_existing.request_fingerprint <> v_request_fingerprint then
      raise exception using errcode = '23505', message = 'idempotency_key_conflict';
    end if;

    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'orderId', v_existing.order_id,
      'orderReference', v_existing.reference,
      'paymentAttemptId', v_existing.attempt_id,
      'paymentReference', v_existing.reference,
      'paymentStatus', v_existing.payment_status,
      'attemptStatus', v_existing.attempt_status,
      'subtotal', v_existing.subtotal,
      'deliveryFee', v_existing.delivery_fee,
      'total', v_existing.total,
      'expectedAmountKobo', v_existing.expected_amount_kobo,
      'currency', v_existing.currency,
      'providerDomain', v_existing.provider_domain,
      'reservationExpiresAt', v_existing.expires_at,
      'authorizationUrl', v_existing.authorization_url,
      'accessCode', v_existing.access_code,
      'items', v_existing.items
    );
  end if;

  perform product.id
  from public.products as product
  join jsonb_to_recordset(v_requested_items) as requested("productId" text, quantity integer)
    on requested."productId" = product.id
  order by product.id
  for update of product;

  select string_agg(requested."productId", ', ' order by requested."productId")
  into v_unavailable_products
  from jsonb_to_recordset(v_requested_items) as requested("productId" text, quantity integer)
  left join public.products as product on product.id = requested."productId"
  where product.id is null
    or not product.is_active
    or product.inventory_count < requested.quantity
    or (
      product.category_id is not null
      and not exists (
        select 1
        from public.categories as category
        where category.id = product.category_id
          and category.is_active
      )
    );

  if v_unavailable_products is not null then
    raise exception using
      errcode = 'P0001',
      message = 'products_unavailable',
      detail = v_unavailable_products;
  end if;

  select
    jsonb_agg(
      jsonb_build_object(
        'productId', product.id,
        'name', product.name,
        'price', product.price,
        'quantity', requested.quantity,
        'lineTotal', (product.price::bigint * requested.quantity)::integer
      )
      order by product.id
    ),
    sum(product.price::bigint * requested.quantity)
  into v_order_items, v_subtotal_bigint
  from jsonb_to_recordset(v_requested_items) as requested("productId" text, quantity integer)
  join public.products as product on product.id = requested."productId";

  if v_subtotal_bigint is null
    or v_subtotal_bigint <= 0
    or v_subtotal_bigint > 2147483647
    or v_subtotal_bigint + p_delivery_fee::bigint > 2147483647 then
    raise exception using errcode = '22003', message = 'order_total_out_of_range';
  end if;

  v_subtotal := v_subtotal_bigint::integer;
  v_expected_delivery_fee := case when v_subtotal >= 20000 then 0 else 2500 end;
  if p_delivery_fee <> v_expected_delivery_fee then
    raise exception using
      errcode = '22023',
      message = 'delivery_fee_mismatch',
      detail = jsonb_build_object(
        'expectedDeliveryFee', v_expected_delivery_fee,
        'receivedDeliveryFee', p_delivery_fee
      )::text;
  end if;
  v_total := (v_subtotal_bigint + p_delivery_fee::bigint)::integer;
  v_expires_at := now() + make_interval(secs => p_reservation_ttl_seconds);

  insert into public.orders (
    reference,
    customer_email,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_city,
    order_notes,
    subtotal,
    delivery_fee,
    total,
    payment_status,
    payment_currency,
    fulfillment_status,
    paystack_reference,
    items
  ) values (
    v_reference,
    v_customer_email,
    v_customer_name,
    v_customer_phone,
    v_delivery_address,
    v_delivery_city,
    nullif(btrim(p_order_notes), ''),
    v_subtotal,
    p_delivery_fee,
    v_total,
    'pending',
    'NGN',
    'new',
    v_reference,
    v_order_items
  )
  returning id into v_order_id;

  insert into public.payment_attempts (
    order_id,
    provider,
    provider_domain,
    reference,
    idempotency_key,
    request_fingerprint,
    expected_amount_kobo,
    currency,
    status,
    expires_at,
    metadata
  ) values (
    v_order_id,
    'paystack',
    v_provider_domain,
    v_reference,
    v_idempotency_key,
    v_request_fingerprint,
    v_total::bigint * 100,
    'NGN',
    'created',
    v_expires_at,
    jsonb_build_object('itemCount', jsonb_array_length(v_order_items))
  )
  returning id into v_attempt_id;

  with requested as (
    select *
    from jsonb_to_recordset(v_requested_items) as value("productId" text, quantity integer)
  )
  update public.products as product
  set inventory_count = product.inventory_count - requested.quantity,
      updated_at = now()
  from requested
  where product.id = requested."productId";

  insert into public.inventory_reservations (
    order_id,
    payment_attempt_id,
    product_id,
    quantity,
    status,
    expires_at
  )
  select
    v_order_id,
    v_attempt_id,
    requested."productId",
    requested.quantity,
    'reserved',
    v_expires_at
  from jsonb_to_recordset(v_requested_items) as requested("productId" text, quantity integer);

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'orderId', v_order_id,
    'orderReference', v_reference,
    'paymentAttemptId', v_attempt_id,
    'paymentReference', v_reference,
    'paymentStatus', 'pending',
    'attemptStatus', 'created',
    'subtotal', v_subtotal,
    'deliveryFee', p_delivery_fee,
    'total', v_total,
    'expectedAmountKobo', v_total::bigint * 100,
    'currency', 'NGN',
    'providerDomain', v_provider_domain,
    'reservationExpiresAt', v_expires_at,
    'authorizationUrl', null,
    'accessCode', null,
    'items', v_order_items
  );
end
$function$;

create or replace function public.claim_paystack_initialization(
  p_reference text,
  p_claim_token text,
  p_lease_seconds integer default 45
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_reference text := btrim(p_reference);
  v_claim_token text := btrim(p_claim_token);
  v_claimed boolean := false;
  v_was_reclaim boolean := false;
  v_claim_reason text;
begin
  if v_reference is null or v_reference = ''
    or v_claim_token is null or char_length(v_claim_token) not between 16 and 200
    or p_lease_seconds not between 15 and 300 then
    raise exception using errcode = '22023', message = 'initialization_claim_invalid';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where reference = v_reference
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'payment_attempt_not_found';
  end if;

  if v_attempt.authorization_url is not null then
    v_claim_reason := 'already_initialized';
  elsif v_attempt.status in ('succeeded', 'failed', 'abandoned', 'cancelled', 'released', 'review', 'refund_pending', 'refunded', 'partially_refunded') then
    v_claim_reason := 'attempt_terminal';
  elsif v_attempt.expires_at <= now() then
    v_claim_reason := 'reservation_expired';
  elsif v_attempt.status = 'initializing'
    and v_attempt.initialization_claim_token is not null
    and v_attempt.initialization_claim_expires_at > now() then
    v_claim_reason := 'claim_in_progress';
  elsif v_attempt.status = 'created'
    or (
      v_attempt.status = 'initializing'
      and (
        v_attempt.initialization_claim_token is null
        or v_attempt.initialization_claim_expires_at is null
        or v_attempt.initialization_claim_expires_at <= now()
      )
    ) then
    v_was_reclaim := v_attempt.status = 'initializing';
    update public.payment_attempts
    set status = 'initializing',
        initialization_claim_token = v_claim_token,
        initialization_claimed_at = now(),
        initialization_claim_expires_at = now() + make_interval(secs => p_lease_seconds),
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;
    v_claimed := true;
    v_claim_reason := case when v_was_reclaim then 'claim_reclaimed' else 'claim_acquired' end;
  else
    v_claim_reason := 'attempt_not_claimable';
  end if;

  return jsonb_build_object(
    'ok', true,
    'claimed', v_claimed,
    'claimReason', v_claim_reason,
    'claimExpiresAt', case when v_claimed then v_attempt.initialization_claim_expires_at else null end,
    'paymentAttemptId', v_attempt.id,
    'paymentReference', v_attempt.reference,
    'attemptStatus', v_attempt.status,
    'providerDomain', v_attempt.provider_domain,
    'authorizationUrl', v_attempt.authorization_url,
    'accessCode', v_attempt.access_code
  );
end
$function$;

create or replace function public.save_paystack_initialization(
  p_reference text,
  p_authorization_url text,
  p_access_code text,
  p_claim_token text,
  p_provider_status text default 'pending',
  p_provider_transaction_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_reference text := btrim(p_reference);
  v_authorization_url text := btrim(p_authorization_url);
  v_access_code text := btrim(p_access_code);
  v_claim_token text := btrim(p_claim_token);
  v_provider_status text := lower(btrim(coalesce(p_provider_status, 'pending')));
  v_provider_transaction_id text := nullif(btrim(p_provider_transaction_id), '');
  v_replayed boolean := false;
begin
  if v_reference is null or v_reference = ''
    or v_authorization_url is null or v_authorization_url !~ '^https://'
    or v_access_code is null or v_access_code = ''
    or v_claim_token is null or char_length(v_claim_token) not between 16 and 200 then
    raise exception using errcode = '22023', message = 'paystack_initialization_invalid';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where reference = v_reference
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'payment_attempt_not_found';
  end if;

  if v_attempt.authorization_url is not null then
    if v_attempt.authorization_url <> v_authorization_url
      or v_attempt.access_code <> v_access_code
      or (
        v_provider_transaction_id is not null
        and v_attempt.provider_transaction_id is distinct from v_provider_transaction_id
      ) then
      raise exception using errcode = '23505', message = 'paystack_initialization_conflict';
    end if;
    v_replayed := true;
  elsif v_attempt.status <> 'initializing'
    or v_attempt.initialization_claim_token is distinct from v_claim_token then
    raise exception using errcode = '55000', message = 'initialization_claim_not_owned';
  elsif v_attempt.status in ('succeeded', 'failed', 'abandoned', 'cancelled', 'released') then
    raise exception using errcode = '55000', message = 'payment_attempt_not_initializable';
  else
    update public.payment_attempts
    set status = 'initialized',
        provider_status = v_provider_status,
        provider_transaction_id = coalesce(v_provider_transaction_id, provider_transaction_id),
        authorization_url = v_authorization_url,
        access_code = v_access_code,
        initialization_claim_token = null,
        initialization_claim_expires_at = null,
        initialized_at = coalesce(initialized_at, now()),
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'ok', true,
    'replayed', v_replayed,
    'paymentAttemptId', v_attempt.id,
    'paymentReference', v_attempt.reference,
    'attemptStatus', v_attempt.status,
    'providerDomain', v_attempt.provider_domain,
    'providerStatus', v_attempt.provider_status,
    'authorizationUrl', v_attempt.authorization_url,
    'accessCode', v_attempt.access_code,
    'initializedAt', v_attempt.initialized_at
  );
end
$function$;

create or replace function public.release_payment_attempt(
  p_reference text,
  p_reason text default 'released_by_application',
  p_claim_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_reference text := btrim(p_reference);
  v_reason text := left(coalesce(nullif(btrim(p_reason), ''), 'released_by_application'), 1000);
  v_claim_token text := nullif(btrim(p_claim_token), '');
  v_reservation_count integer := 0;
  v_released_units integer := 0;
  v_order_payment_status text;
begin
  if v_reference is null or v_reference = '' then
    raise exception using errcode = '22023', message = 'payment_reference_invalid';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where reference = v_reference
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'payment_attempt_not_found';
  end if;

  select * into v_order
  from public.orders
  where id = v_attempt.order_id
  for update;

  if v_claim_token is not null
    and (
      v_attempt.status <> 'initializing'
      or v_attempt.initialization_claim_token is distinct from v_claim_token
    ) then
    raise exception using errcode = '55000', message = 'initialization_claim_not_owned';
  elsif v_attempt.status = 'initializing'
    and (
      v_claim_token is null
      or v_attempt.initialization_claim_token is distinct from v_claim_token
    ) then
    raise exception using errcode = '55000', message = 'initialization_claim_not_owned';
  end if;

  if v_attempt.status in ('succeeded', 'refund_pending', 'refunded', 'partially_refunded', 'review')
    or v_order.payment_status in ('paid', 'refund_pending', 'refunded', 'partially_refunded', 'review') then
    return jsonb_build_object(
      'ok', false,
      'replayed', true,
      'paymentAttemptId', v_attempt.id,
      'paymentReference', v_attempt.reference,
      'attemptStatus', v_attempt.status,
      'providerDomain', v_attempt.provider_domain,
      'orderPaymentStatus', v_order.payment_status,
      'releasedReservations', 0,
      'releasedUnits', 0
    );
  end if;

  perform reservation.id
  from public.inventory_reservations as reservation
  where reservation.payment_attempt_id = v_attempt.id
  order by reservation.product_id
  for update;

  select count(*)::integer, coalesce(sum(quantity), 0)::integer
  into v_reservation_count, v_released_units
  from public.inventory_reservations
  where payment_attempt_id = v_attempt.id
    and status = 'reserved';

  if v_reservation_count > 0 then
    perform product.id
    from public.products as product
    join public.inventory_reservations as reservation on reservation.product_id = product.id
    where reservation.payment_attempt_id = v_attempt.id
      and reservation.status = 'reserved'
    order by product.id
    for update of product;

    with quantities as (
      select product_id, sum(quantity)::integer as quantity
      from public.inventory_reservations
      where payment_attempt_id = v_attempt.id
        and status = 'reserved'
      group by product_id
    )
    update public.products as product
    set inventory_count = product.inventory_count + quantities.quantity,
        updated_at = now()
    from quantities
    where product.id = quantities.product_id;

    update public.inventory_reservations
    set status = 'released',
        released_at = now(),
        release_reason = v_reason,
        updated_at = now()
    where payment_attempt_id = v_attempt.id
      and status = 'reserved';
  end if;

  update public.payment_attempts
  set status = 'released',
      failure_code = coalesce(failure_code, 'reservation_released'),
      failure_message = v_reason,
      initialization_claim_token = null,
      initialization_claim_expires_at = null,
      finalized_at = coalesce(finalized_at, now()),
      updated_at = now()
  where id = v_attempt.id
    and status not in ('succeeded', 'refund_pending', 'refunded', 'partially_refunded', 'review')
  returning * into v_attempt;

  update public.orders
  set payment_status = case when payment_status = 'pending' then 'failed' else payment_status end,
      payment_failure_reason = case when payment_status = 'pending' then v_reason else payment_failure_reason end,
      updated_at = now()
  where id = v_order.id
  returning payment_status into v_order_payment_status;

  insert into public.payment_events (
    payment_attempt_id,
    order_id,
    provider_domain,
    event_key,
    event_type,
    event_source,
    reference,
    provider_status,
    outcome,
    outcome_reason,
    summary
  ) values (
    v_attempt.id,
    v_order.id,
    v_attempt.provider_domain,
    'reservation-release:' || v_attempt.id::text,
    'reservation.released',
    'system',
    v_attempt.reference,
    v_attempt.provider_status,
    'applied',
    v_reason,
    jsonb_build_object('reservationCount', v_reservation_count, 'releasedUnits', v_released_units)
  )
  on conflict (event_key) do nothing;

  return jsonb_build_object(
    'ok', true,
    'replayed', v_reservation_count = 0,
    'paymentAttemptId', v_attempt.id,
    'paymentReference', v_attempt.reference,
    'attemptStatus', v_attempt.status,
    'providerDomain', v_attempt.provider_domain,
    'orderPaymentStatus', v_order_payment_status,
    'releasedReservations', v_reservation_count,
    'releasedUnits', v_released_units
  );
end
$function$;

create or replace function public.finalize_paystack_payment(
  p_reference text,
  p_event_key text,
  p_provider_transaction_id text,
  p_amount_kobo bigint,
  p_currency text,
  p_provider_status text,
  p_provider_domain text,
  p_paid_at timestamptz default null,
  p_event_source text default 'webhook',
  p_event_summary jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_existing_event public.payment_events%rowtype;
  v_reference text := btrim(p_reference);
  v_event_key text := btrim(p_event_key);
  v_provider_transaction_id text := btrim(p_provider_transaction_id);
  v_currency text := upper(btrim(p_currency));
  v_provider_status text := lower(btrim(p_provider_status));
  v_provider_domain text := lower(btrim(p_provider_domain));
  v_event_source text := lower(btrim(p_event_source));
  v_paid_at timestamptz := coalesce(p_paid_at, now());
  v_captured_count integer := 0;
  v_reservation_count integer := 0;
  v_released_count integer := 0;
  v_conflicting_attempt_id uuid;
  v_reason text;
begin
  if v_event_key is null or char_length(v_event_key) not between 1 and 300
    or v_reference is null or v_reference = ''
    or v_provider_transaction_id is null or v_provider_transaction_id = ''
    or p_amount_kobo is null
    or p_amount_kobo <= 0
    or v_currency is null or v_currency = ''
    or v_provider_status is null or v_provider_status = ''
    or v_provider_domain is null or v_provider_domain not in ('test', 'live')
    or v_event_source not in ('webhook', 'verification', 'reconciliation')
    or jsonb_typeof(coalesce(p_event_summary, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'payment_event_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_event_key, 0));

  select * into v_existing_event
  from public.payment_events
  where event_key = v_event_key;

  if found then
    if v_existing_event.payment_attempt_id is not null then
      select * into v_attempt
      from public.payment_attempts
      where id = v_existing_event.payment_attempt_id;

      if found then
        select * into v_order
        from public.orders
        where id = v_attempt.order_id;
      end if;
    end if;

    return jsonb_build_object(
      'ok', v_existing_event.outcome in ('applied', 'duplicate', 'ignored'),
      'replayed', true,
      'eventOutcome', v_existing_event.outcome,
      'eventReason', v_existing_event.outcome_reason,
      'providerDomain', v_existing_event.provider_domain,
      'paymentAttemptId', v_existing_event.payment_attempt_id,
      'orderId', v_existing_event.order_id,
      'paymentReference', v_existing_event.reference,
      'attemptStatus', v_attempt.status,
      'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at,
      'capturedReservations', 0
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'paystack-transaction:' || v_provider_domain || ':' || v_provider_transaction_id,
      0
    )
  );

  select * into v_attempt
  from public.payment_attempts
  where reference = v_reference
  for update;

  if not found then
    insert into public.payment_events (
      event_key, event_type, event_source, provider_domain, reference, provider_transaction_id,
      provider_status, amount_kobo, currency, outcome, outcome_reason, summary, occurred_at
    ) values (
      v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference, v_provider_transaction_id,
      v_provider_status, p_amount_kobo, v_currency, 'rejected', 'payment_attempt_not_found',
      coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );
    return jsonb_build_object(
      'ok', false, 'replayed', false, 'eventOutcome', 'rejected',
      'eventReason', 'payment_attempt_not_found', 'paymentAttemptId', null,
      'orderId', null, 'paymentReference', v_reference, 'providerDomain', v_provider_domain, 'attemptStatus', null,
      'orderPaymentStatus', null, 'paidAt', null, 'capturedReservations', 0
    );
  end if;

  select * into v_order
  from public.orders
  where id = v_attempt.order_id
  for update;

  if v_provider_domain = v_attempt.provider_domain then
    select conflicting.id into v_conflicting_attempt_id
    from public.payment_attempts as conflicting
    where conflicting.provider = v_attempt.provider
      and conflicting.provider_domain = v_provider_domain
      and conflicting.provider_transaction_id = v_provider_transaction_id
      and conflicting.id <> v_attempt.id
    for update;
  end if;

  if v_provider_domain <> v_attempt.provider_domain then
    v_reason := 'provider_domain_mismatch';
  elsif v_provider_status <> 'success' then
    v_reason := 'provider_status_not_success';
  elsif v_currency <> v_attempt.currency then
    v_reason := 'currency_mismatch';
  elsif p_amount_kobo <> v_attempt.expected_amount_kobo then
    v_reason := 'amount_mismatch';
  elsif v_attempt.provider_transaction_id is not null
    and v_attempt.provider_transaction_id <> v_provider_transaction_id then
    v_reason := 'provider_transaction_conflict';
  elsif v_conflicting_attempt_id is not null then
    v_reason := 'provider_transaction_claimed_by_another_attempt';
  end if;

  if v_reason in ('provider_status_not_success', 'currency_mismatch', 'amount_mismatch')
    and (
      v_attempt.status in ('refund_pending', 'refunded', 'partially_refunded')
      or v_order.payment_status in ('refund_pending', 'refunded', 'partially_refunded')
    ) then
    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'ignored',
      'refund_state_preserved_from_charge_event', coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );

    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'eventOutcome', 'ignored',
      'eventReason', 'refund_state_preserved_from_charge_event',
      'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id,
      'paymentReference', v_reference,
      'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status,
      'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at,
      'capturedReservations', 0
    );
  end if;

  if v_order.payment_status = 'reversed'
    and v_reason in ('provider_status_not_success', 'currency_mismatch', 'amount_mismatch') then
    update public.payment_attempts
    set status = case
          when status in ('refund_pending', 'refunded', 'partially_refunded') then status
          else 'review'
        end,
        provider_status = v_provider_status,
        initialization_claim_token = null,
        initialization_claim_expires_at = null,
        finalized_at = coalesce(finalized_at, now()),
        failure_code = 'late_charge_after_reversal',
        failure_message = v_reason,
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

    perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);

    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'ignored',
      'reversed_state_preserved_from_charge_event', coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );

    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'eventOutcome', 'ignored',
      'eventReason', 'reversed_state_preserved_from_charge_event',
      'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id,
      'paymentReference', v_reference,
      'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status,
      'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at,
      'capturedReservations', 0
    );
  end if;

  if v_reason is null
    and (v_attempt.status = 'review' or v_order.payment_status = 'review') then
    v_reason := 'review_state_preserved';
    perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);

    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'ignored',
      v_reason, coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );

    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'eventOutcome', 'ignored',
      'eventReason', v_reason,
      'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id,
      'paymentReference', v_reference,
      'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status,
      'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at,
      'capturedReservations', 0
    );
  end if;

  if v_reason is null
    and (
      v_order.payment_status in ('failed', 'abandoned', 'cancelled', 'reversed')
      or v_attempt.status in ('failed', 'abandoned', 'cancelled', 'released')
    ) then
    v_reason := case
      when v_order.payment_status = 'reversed' then 'charge_success_after_reversal'
      when v_attempt.status = 'released' then 'charge_success_after_released_attempt'
      else 'charge_success_after_terminal_unpaid_state'
    end;

    update public.payment_attempts
    set status = case
          when status in ('refund_pending', 'refunded', 'partially_refunded') then status
          else 'review'
        end,
        provider_status = v_provider_status,
        provider_transaction_id = coalesce(provider_transaction_id, v_provider_transaction_id),
        paid_at = coalesce(paid_at, v_paid_at),
        initialization_claim_token = null,
        initialization_claim_expires_at = null,
        finalized_at = coalesce(finalized_at, now()),
        failure_code = 'late_success_requires_review',
        failure_message = v_reason,
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.orders
    set payment_status = case
          when payment_status in ('refund_pending', 'refunded', 'partially_refunded', 'reversed') then payment_status
          else 'review'
        end,
        paid_at = coalesce(paid_at, v_paid_at),
        payment_failure_reason = v_reason,
        updated_at = now()
    where id = v_order.id
    returning * into v_order;

    perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);

    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'ignored',
      v_reason, coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );

    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'eventOutcome', 'ignored',
      'eventReason', v_reason,
      'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id,
      'paymentReference', v_reference,
      'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status,
      'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at,
      'capturedReservations', 0
    );
  end if;

  if v_reason is not null then
    if v_reason in (
      'currency_mismatch',
      'amount_mismatch',
      'provider_transaction_conflict',
      'provider_transaction_claimed_by_another_attempt'
    ) then
      update public.payment_attempts
      set status = 'review',
          provider_status = v_provider_status,
          paid_at = coalesce(paid_at, v_paid_at),
          initialization_claim_token = null,
          initialization_claim_expires_at = null,
          finalized_at = coalesce(finalized_at, now()),
          failure_code = 'paid_reconciliation_review',
          failure_message = v_reason,
          updated_at = now()
      where id = v_attempt.id
      returning * into v_attempt;

      update public.orders
      set payment_status = 'review',
          paid_at = coalesce(paid_at, v_paid_at),
          payment_failure_reason = v_reason,
          updated_at = now()
      where id = v_order.id
      returning * into v_order;

      perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);
    end if;

    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'rejected',
      v_reason, coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );
    return jsonb_build_object(
      'ok', false, 'replayed', false, 'eventOutcome', 'rejected',
      'eventReason', v_reason, 'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id, 'paymentReference', v_reference, 'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status, 'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at, 'capturedReservations', 0
    );
  end if;

  if v_attempt.status in ('succeeded', 'refund_pending', 'refunded', 'partially_refunded')
    and v_order.payment_status in ('paid', 'refund_pending', 'refunded', 'partially_refunded') then
    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'duplicate',
      'payment_already_finalized', coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );
    return jsonb_build_object(
      'ok', true, 'replayed', true, 'eventOutcome', 'duplicate',
      'eventReason', 'payment_already_finalized', 'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id, 'paymentReference', v_reference, 'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status, 'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at, 'capturedReservations', 0
    );
  end if;

  perform reservation.id
  from public.inventory_reservations as reservation
  where reservation.payment_attempt_id = v_attempt.id
  order by reservation.product_id
  for update;

  select
    count(*)::integer,
    count(*) filter (where status = 'released')::integer
  into v_reservation_count, v_released_count
  from public.inventory_reservations
  where payment_attempt_id = v_attempt.id;

  if v_reservation_count = 0 or v_released_count > 0 then
    v_reason := case when v_reservation_count = 0 then 'reservation_not_found' else 'reservation_already_released' end;

    update public.payment_attempts
    set status = 'review',
        provider_status = v_provider_status,
        provider_transaction_id = v_provider_transaction_id,
        paid_at = v_paid_at,
        initialization_claim_token = null,
        initialization_claim_expires_at = null,
        finalized_at = coalesce(finalized_at, now()),
        failure_code = 'paid_reservation_review',
        failure_message = v_reason,
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.orders
    set payment_status = 'review',
        paid_at = coalesce(paid_at, v_paid_at),
        payment_failure_reason = v_reason,
        updated_at = now()
    where id = v_order.id
    returning * into v_order;

    perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);

    insert into public.payment_events (
      payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
      provider_transaction_id, provider_status, amount_kobo, currency, outcome,
      outcome_reason, summary, occurred_at
    ) values (
      v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
      v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'rejected',
      v_reason, coalesce(p_event_summary, '{}'::jsonb), p_paid_at
    );
    return jsonb_build_object(
      'ok', false, 'replayed', false, 'eventOutcome', 'rejected',
      'eventReason', v_reason, 'paymentAttemptId', v_attempt.id,
      'orderId', v_order.id, 'paymentReference', v_reference, 'providerDomain', v_provider_domain,
      'attemptStatus', v_attempt.status, 'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at, 'capturedReservations', 0
    );
  end if;

  update public.inventory_reservations
  set status = 'captured',
      captured_at = v_paid_at,
      updated_at = now()
  where payment_attempt_id = v_attempt.id
    and status = 'reserved';
  get diagnostics v_captured_count = row_count;

  if v_captured_count <> v_reservation_count then
    raise exception using errcode = '40001', message = 'reservation_capture_conflict';
  end if;

  update public.payment_attempts
  set status = 'succeeded',
      provider_status = v_provider_status,
      provider_transaction_id = v_provider_transaction_id,
      paid_at = v_paid_at,
      initialization_claim_token = null,
      initialization_claim_expires_at = null,
      finalized_at = coalesce(finalized_at, now()),
      failure_code = null,
      failure_message = null,
      updated_at = now()
  where id = v_attempt.id
  returning * into v_attempt;

  update public.orders
  set payment_status = 'paid',
      payment_currency = v_currency,
      paystack_reference = v_reference,
      paid_at = coalesce(paid_at, v_paid_at),
      payment_confirmed_at = coalesce(payment_confirmed_at, now()),
      payment_confirmation_source = coalesce(payment_confirmation_source, v_event_source),
      payment_confirmation_queued_at = coalesce(payment_confirmation_queued_at, now()),
      payment_failure_reason = null,
      updated_at = now()
  where id = v_order.id
  returning * into v_order;

  perform private.enqueue_payment_confirmation_notifications(v_order.id, v_attempt.id);

  insert into public.payment_events (
    payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
    provider_transaction_id, provider_status, amount_kobo, currency, outcome,
    outcome_reason, summary, occurred_at
  ) values (
    v_attempt.id, v_order.id, v_event_key, 'charge.success', v_event_source, v_provider_domain, v_reference,
    v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, 'applied',
    'payment_finalized', coalesce(p_event_summary, '{}'::jsonb), p_paid_at
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'eventOutcome', 'applied',
    'eventReason', 'payment_finalized',
    'paymentAttemptId', v_attempt.id,
    'orderId', v_order.id,
    'paymentReference', v_reference,
    'providerDomain', v_provider_domain,
    'attemptStatus', v_attempt.status,
    'orderPaymentStatus', v_order.payment_status,
    'paidAt', v_order.paid_at,
    'capturedReservations', v_captured_count
  );
end
$function$;

create or replace function public.record_paystack_payment_status(
  p_reference text,
  p_event_key text,
  p_event_type text,
  p_provider_status text,
  p_provider_domain text,
  p_provider_transaction_id text default null,
  p_amount_kobo bigint default null,
  p_currency text default null,
  p_event_source text default 'verification',
  p_occurred_at timestamptz default null,
  p_event_summary jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_existing_event public.payment_events%rowtype;
  v_reference text := btrim(p_reference);
  v_event_key text := btrim(p_event_key);
  v_event_type text := btrim(p_event_type);
  v_provider_status text := lower(btrim(p_provider_status));
  v_provider_domain text := lower(btrim(p_provider_domain));
  v_provider_transaction_id text := nullif(btrim(p_provider_transaction_id), '');
  v_currency text := nullif(upper(btrim(p_currency)), '');
  v_event_source text := lower(btrim(p_event_source));
  v_attempt_status text;
  v_order_status text;
  v_outcome text := 'applied';
  v_conflicting_attempt_id uuid;
  v_reason text;
begin
  if v_event_key is null or char_length(v_event_key) not between 1 and 300
    or v_event_type is null or char_length(v_event_type) not between 1 and 120
    or v_reference is null or v_reference = ''
    or v_provider_status is null or v_provider_status = ''
    or v_provider_domain is null or v_provider_domain not in ('test', 'live')
    or (p_amount_kobo is not null and p_amount_kobo <= 0)
    or v_event_source not in ('webhook', 'verification', 'reconciliation')
    or jsonb_typeof(coalesce(p_event_summary, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'payment_event_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_event_key, 0));

  select * into v_existing_event
  from public.payment_events
  where event_key = v_event_key;

  if found then
    if v_existing_event.payment_attempt_id is not null then
      select * into v_attempt
      from public.payment_attempts
      where id = v_existing_event.payment_attempt_id;

      if found then
        select * into v_order
        from public.orders
        where id = v_attempt.order_id;
      end if;
    end if;

    return jsonb_build_object(
      'ok', v_existing_event.outcome in ('applied', 'duplicate', 'ignored'),
      'replayed', true,
      'eventOutcome', v_existing_event.outcome,
      'eventReason', v_existing_event.outcome_reason,
      'providerDomain', v_existing_event.provider_domain,
      'paymentAttemptId', v_existing_event.payment_attempt_id,
      'orderId', v_existing_event.order_id,
      'paymentReference', v_existing_event.reference,
      'attemptStatus', v_attempt.status,
      'orderPaymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at
    );
  end if;

  if v_event_type not like 'refund.%' and v_provider_transaction_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'paystack-transaction:' || v_provider_domain || ':' || v_provider_transaction_id,
        0
      )
    );
  end if;

  select * into v_attempt
  from public.payment_attempts
  where reference = v_reference
  for update;

  if not found then
    insert into public.payment_events (
      event_key, event_type, event_source, provider_domain, reference, provider_transaction_id,
      provider_status, amount_kobo, currency, outcome, outcome_reason, summary, occurred_at
    ) values (
      v_event_key, v_event_type, v_event_source, v_provider_domain, v_reference, v_provider_transaction_id,
      v_provider_status, p_amount_kobo, v_currency, 'rejected', 'payment_attempt_not_found',
      coalesce(p_event_summary, '{}'::jsonb), p_occurred_at
    );
    return jsonb_build_object(
      'ok', false, 'replayed', false, 'eventOutcome', 'rejected',
      'eventReason', 'payment_attempt_not_found', 'paymentAttemptId', null,
      'paymentReference', v_reference, 'providerDomain', v_provider_domain, 'attemptStatus', null, 'orderPaymentStatus', null
    );
  end if;

  select * into v_order
  from public.orders
  where id = v_attempt.order_id
  for update;

  if v_event_type not like 'refund.%'
    and v_provider_transaction_id is not null
    and v_provider_domain = v_attempt.provider_domain then
    select conflicting.id into v_conflicting_attempt_id
    from public.payment_attempts as conflicting
    where conflicting.provider = v_attempt.provider
      and conflicting.provider_domain = v_provider_domain
      and conflicting.provider_transaction_id = v_provider_transaction_id
      and conflicting.id <> v_attempt.id
    for update;
  end if;

  if v_provider_domain <> v_attempt.provider_domain then
    v_reason := 'provider_domain_mismatch';
  elsif p_amount_kobo is not null
    and v_event_type not like 'refund.%'
    and p_amount_kobo <> v_attempt.expected_amount_kobo then
    v_reason := 'amount_mismatch';
  elsif v_currency is not null and v_currency <> v_attempt.currency then
    v_reason := 'currency_mismatch';
  elsif v_event_type not like 'refund.%'
    and v_provider_transaction_id is not null
    and v_attempt.provider_transaction_id is not null
    and v_provider_transaction_id <> v_attempt.provider_transaction_id then
    v_reason := 'provider_transaction_conflict';
  elsif v_conflicting_attempt_id is not null then
    v_reason := 'provider_transaction_claimed_by_another_attempt';
  end if;

  if v_reason is not null then
    v_outcome := 'rejected';
    if v_reason <> 'provider_domain_mismatch'
      and (
        v_reason in ('provider_transaction_conflict', 'provider_transaction_claimed_by_another_attempt')
        or (
          v_attempt.status not in ('refund_pending', 'refunded', 'partially_refunded')
          and v_order.payment_status not in ('refund_pending', 'refunded', 'partially_refunded', 'reversed')
        )
      ) then
      update public.payment_attempts
      set status = 'review',
          provider_status = v_provider_status,
          initialization_claim_token = null,
          initialization_claim_expires_at = null,
          finalized_at = coalesce(finalized_at, now()),
          failure_code = 'payment_event_reconciliation_review',
          failure_message = v_reason,
          updated_at = now()
      where id = v_attempt.id
      returning * into v_attempt;

      update public.orders
      set payment_status = 'review',
          payment_failure_reason = v_reason,
          updated_at = now()
      where id = v_order.id
      returning * into v_order;

      perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);
    elsif v_reason <> 'provider_domain_mismatch' then
      perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);
    end if;
  elsif v_event_type in (
    'charge.dispute.create',
    'charge.dispute.remind',
    'charge.dispute.resolve'
  ) then
    if v_attempt.status in ('refund_pending', 'refunded', 'partially_refunded')
      or v_order.payment_status in ('refund_pending', 'refunded', 'partially_refunded') then
      v_outcome := 'ignored';
      v_reason := 'refund_state_preserved_from_dispute';
    elsif v_order.payment_status = 'reversed' then
      v_outcome := 'ignored';
      v_reason := 'reversed_state_preserved_from_dispute';
    elsif v_attempt.status = 'review' or v_order.payment_status = 'review' then
      v_outcome := 'ignored';
      v_reason := 'dispute_review_state_preserved';
    else
      v_attempt_status := 'review';
      v_order_status := 'review';
      v_reason := case v_event_type
        when 'charge.dispute.create' then 'payment_dispute_opened'
        when 'charge.dispute.remind' then 'payment_dispute_reminder'
        else 'payment_dispute_resolved_requires_review'
      end;
    end if;
  elsif v_event_type like 'refund.%' then
    if v_attempt.status = 'refunded' or v_order.payment_status = 'refunded' then
      v_outcome := 'ignored';
      v_reason := 'refunded_state_preserved';
    elsif v_attempt.status = 'review'
      and v_order.payment_status = 'reversed'
      and v_provider_status in ('processed', 'success', 'refunded') then
      if p_amount_kobo is null or p_amount_kobo > v_attempt.expected_amount_kobo then
        v_attempt_status := 'review';
        v_order_status := 'review';
        v_reason := 'refund_amount_requires_review_after_reversal';
      elsif p_amount_kobo = v_attempt.expected_amount_kobo then
        v_attempt_status := 'refunded';
        v_order_status := 'refunded';
        v_reason := 'refund_processed_after_reversal';
      else
        v_attempt_status := 'partially_refunded';
        v_order_status := 'partially_refunded';
        v_reason := 'partial_refund_processed_after_reversal';
      end if;
    elsif v_attempt.status = 'review' or v_order.payment_status = 'review' then
      v_outcome := 'ignored';
      v_reason := 'review_state_preserved';
    elsif v_attempt.status = 'partially_refunded'
      or v_order.payment_status = 'partially_refunded' then
      if v_provider_status in ('processed', 'success', 'refunded') then
        v_attempt_status := 'review';
        v_order_status := 'review';
        v_reason := 'multiple_partial_refunds_require_review';
      elsif v_provider_status in ('error', 'needs-attention', 'needs_attention', 'requires_action') then
        v_attempt_status := 'review';
        v_order_status := 'review';
        v_reason := 'refund_' || v_provider_status;
      else
        v_outcome := 'ignored';
        v_reason := 'partial_refund_state_preserved';
      end if;
    elsif v_attempt.status not in ('succeeded', 'refund_pending')
      or v_order.payment_status not in ('paid', 'refund_pending') then
      v_attempt_status := 'review';
      v_order_status := 'review';
      v_reason := 'refund_for_unfinalized_payment';
    elsif v_provider_status in ('pending', 'queued', 'processing', 'ongoing') then
      v_attempt_status := 'refund_pending';
      v_order_status := 'refund_pending';
      v_reason := 'refund_pending';
    elsif v_provider_status in ('processed', 'success', 'refunded') then
      if p_amount_kobo is null or p_amount_kobo > v_attempt.expected_amount_kobo then
        v_attempt_status := 'review';
        v_order_status := 'review';
        v_reason := 'refund_amount_requires_review';
      elsif p_amount_kobo = v_attempt.expected_amount_kobo then
        v_attempt_status := 'refunded';
        v_order_status := 'refunded';
        v_reason := 'refund_processed';
      else
        v_attempt_status := 'partially_refunded';
        v_order_status := 'partially_refunded';
        v_reason := 'partial_refund_processed';
      end if;
    elsif v_provider_status = 'failed' then
      if v_attempt.status = 'refund_pending' or v_order.payment_status = 'refund_pending' then
        v_attempt_status := 'succeeded';
        v_order_status := 'paid';
        v_reason := 'refund_failed_restored_paid';
      else
        v_outcome := 'ignored';
        v_reason := 'refund_failed_payment_remains_paid';
      end if;
    elsif v_provider_status in ('error', 'needs-attention', 'needs_attention', 'requires_action') then
      v_attempt_status := 'review';
      v_order_status := 'review';
      v_reason := 'refund_' || v_provider_status;
    else
      v_outcome := 'ignored';
      v_reason := 'refund_status_unmapped';
    end if;
  elsif v_event_type not like 'refund.%'
    and v_provider_status in ('reversal_pending', 'reversal pending') then
    if v_attempt.status in ('refund_pending', 'refunded', 'partially_refunded')
      or v_order.payment_status in ('refund_pending', 'refunded', 'partially_refunded') then
      v_outcome := 'ignored';
      v_reason := 'refund_state_preserved_from_reversal_pending';
    elsif v_order.payment_status = 'reversed' then
      v_outcome := 'ignored';
      v_reason := 'reversed_state_preserved_from_reversal_pending';
    elsif v_attempt.status = 'review' or v_order.payment_status = 'review' then
      v_outcome := 'ignored';
      v_reason := 'review_state_preserved';
    elsif v_attempt.status = 'succeeded' or v_order.payment_status = 'paid' then
      v_attempt_status := 'refund_pending';
      v_order_status := 'refund_pending';
      v_reason := 'provider_reported_reversal_pending';
    else
      v_attempt_status := 'review';
      v_order_status := 'review';
      v_reason := 'reversal_pending_for_unfinalized_payment';
    end if;
  elsif v_event_type not like 'refund.%' and v_provider_status = 'reversed' then
    if v_attempt.status in ('refunded', 'partially_refunded')
      or v_order.payment_status in ('refunded', 'partially_refunded') then
      v_outcome := 'ignored';
      v_reason := 'refund_state_preserved_from_reversal';
    elsif v_attempt.status = 'refund_pending'
      or v_order.payment_status = 'refund_pending' then
      v_attempt_status := 'review';
      v_order_status := 'reversed';
      v_reason := 'provider_reversal_completed_from_refund_pending';
    elsif v_attempt.status = 'review'
      and v_order.payment_status = 'review'
      and v_attempt.provider_status in ('reversal_pending', 'reversal pending') then
      v_attempt_status := 'cancelled';
      v_order_status := 'reversed';
      v_reason := 'provider_reversal_completed_unfinalized';
    elsif v_attempt.status = 'review' or v_order.payment_status = 'review' then
      v_outcome := 'ignored';
      v_reason := 'review_state_preserved';
    elsif v_attempt.status = 'succeeded' or v_order.payment_status = 'paid' then
      v_attempt_status := 'review';
      v_order_status := 'reversed';
      v_reason := 'provider_reported_reversed';
    else
      v_attempt_status := 'cancelled';
      v_order_status := 'reversed';
      v_reason := 'provider_reported_reversed_unpaid';
    end if;
  elsif v_attempt.status in ('succeeded', 'refund_pending', 'refunded', 'partially_refunded', 'review')
    or v_order.payment_status in ('paid', 'refund_pending', 'refunded', 'partially_refunded', 'review') then
    v_outcome := 'ignored';
    v_reason := 'paid_order_not_downgraded';
  elsif v_attempt.status in ('failed', 'abandoned', 'cancelled', 'released')
    or v_order.payment_status in ('failed', 'abandoned', 'cancelled', 'reversed') then
    v_outcome := 'ignored';
    v_reason := 'terminal_unpaid_state_preserved';
  elsif v_provider_status in ('pending', 'queued') then
    v_attempt_status := 'pending';
    v_order_status := 'pending';
    v_reason := 'provider_status_recorded';
  elsif v_provider_status in ('ongoing', 'processing') then
    v_attempt_status := 'processing';
    v_order_status := 'processing';
    v_reason := 'provider_status_recorded';
  elsif v_provider_status = 'failed' then
    v_attempt_status := 'failed';
    v_order_status := 'failed';
    v_reason := 'provider_reported_failed';
  elsif v_provider_status = 'abandoned' then
    v_attempt_status := 'abandoned';
    v_order_status := 'abandoned';
    v_reason := 'provider_reported_abandoned';
  elsif v_provider_status in ('cancelled', 'canceled') then
    v_attempt_status := 'cancelled';
    v_order_status := 'cancelled';
    v_reason := 'provider_reported_' || v_provider_status;
  elsif v_provider_status = 'success' then
    v_outcome := 'rejected';
    v_reason := 'success_requires_finalize_rpc';
  else
    v_outcome := 'ignored';
    v_reason := 'provider_status_unmapped';
  end if;

  if v_outcome = 'applied' then
    update public.payment_attempts
    set status = v_attempt_status,
        provider_status = v_provider_status,
        provider_transaction_id = case
          when v_event_type like 'refund.%' then provider_transaction_id
          else coalesce(provider_transaction_id, v_provider_transaction_id)
        end,
        initialization_claim_token = case when v_attempt_status in ('failed', 'abandoned', 'cancelled', 'review') then null else initialization_claim_token end,
        initialization_claim_expires_at = case when v_attempt_status in ('failed', 'abandoned', 'cancelled', 'review') then null else initialization_claim_expires_at end,
        failure_code = case when v_attempt_status in ('failed', 'abandoned', 'cancelled', 'review') then v_provider_status else failure_code end,
        failure_message = case when v_attempt_status in ('failed', 'abandoned', 'cancelled', 'review') then v_reason else failure_message end,
        finalized_at = case when v_attempt_status in ('failed', 'abandoned', 'cancelled', 'review', 'refunded') then coalesce(finalized_at, now()) else finalized_at end,
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.orders
    set payment_status = v_order_status,
        payment_failure_reason = case
          when v_order_status in ('failed', 'abandoned', 'cancelled', 'reversed', 'review') then v_reason
          when v_order_status in ('refund_pending', 'refunded', 'partially_refunded') then null
          else payment_failure_reason
        end,
        updated_at = now()
    where id = v_order.id
    returning * into v_order;

    if v_event_type like 'refund.%'
      and v_provider_status in ('processed', 'success', 'refunded')
      and p_amount_kobo is not null
      and p_amount_kobo <= v_attempt.expected_amount_kobo then
      perform reservation.id
      from public.inventory_reservations as reservation
      where reservation.payment_attempt_id = v_attempt.id
      order by reservation.product_id
      for update;

      perform product.id
      from public.products as product
      join public.inventory_reservations as reservation
        on reservation.product_id = product.id
      where reservation.payment_attempt_id = v_attempt.id
        and reservation.status = 'reserved'
      order by product.id
      for update of product;

      with quantities as (
        select product_id, sum(quantity)::integer as quantity
        from public.inventory_reservations
        where payment_attempt_id = v_attempt.id
          and status = 'reserved'
        group by product_id
      )
      update public.products as product
      set inventory_count = product.inventory_count + quantities.quantity,
          updated_at = now()
      from quantities
      where product.id = quantities.product_id;

      update public.inventory_reservations
      set status = 'released',
          released_at = now(),
          release_reason = 'provider_refund_processed',
          updated_at = now()
      where payment_attempt_id = v_attempt.id
        and status = 'reserved';
    end if;

    if v_attempt.status = 'review' or v_order.payment_status = 'review' then
      perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);
    end if;
  end if;

  if v_event_type in (
    'charge.dispute.create',
    'charge.dispute.remind',
    'charge.dispute.resolve'
  ) and v_reason <> 'provider_domain_mismatch' then
    perform private.enqueue_payment_review_notifications(v_order.id, v_attempt.id, v_reason);
  end if;

  insert into public.payment_events (
    payment_attempt_id, order_id, event_key, event_type, event_source, provider_domain, reference,
    provider_transaction_id, provider_status, amount_kobo, currency, outcome,
    outcome_reason, summary, occurred_at
  ) values (
    v_attempt.id, v_order.id, v_event_key, v_event_type, v_event_source, v_provider_domain, v_reference,
    v_provider_transaction_id, v_provider_status, p_amount_kobo, v_currency, v_outcome,
    v_reason, coalesce(p_event_summary, '{}'::jsonb), p_occurred_at
  );

  return jsonb_build_object(
    'ok', v_outcome in ('applied', 'ignored'),
    'replayed', false,
    'eventOutcome', v_outcome,
    'eventReason', v_reason,
    'paymentAttemptId', v_attempt.id,
    'paymentReference', v_reference,
    'providerDomain', v_provider_domain,
    'attemptStatus', v_attempt.status,
    'orderPaymentStatus', v_order.payment_status
  );
end
$function$;

create or replace function public.release_expired_payment_reservations(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_candidate record;
  v_reservation_count integer;
  v_unit_count integer;
  v_released_attempts integer := 0;
  v_released_reservations integer := 0;
  v_released_units integer := 0;
begin
  if p_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'release_limit_invalid';
  end if;

  for v_candidate in
    select
      attempt.id as attempt_id,
      attempt.order_id,
      attempt.reference,
      attempt.provider_domain
    from public.payment_attempts as attempt
    join public.orders as orders on orders.id = attempt.order_id
    where attempt.status not in ('succeeded', 'refund_pending', 'refunded', 'partially_refunded', 'review')
      and orders.payment_status not in ('paid', 'refund_pending', 'refunded', 'partially_refunded', 'review')
      and exists (
        select 1
        from public.inventory_reservations as reservation
        where reservation.payment_attempt_id = attempt.id
          and reservation.status = 'reserved'
          and reservation.expires_at <= now()
      )
    order by attempt.expires_at, attempt.id
    limit p_limit
    for update of attempt, orders skip locked
  loop
    perform reservation.id
    from public.inventory_reservations as reservation
    where reservation.payment_attempt_id = v_candidate.attempt_id
    order by reservation.product_id
    for update;

    select count(*)::integer, coalesce(sum(quantity), 0)::integer
    into v_reservation_count, v_unit_count
    from public.inventory_reservations
    where payment_attempt_id = v_candidate.attempt_id
      and status = 'reserved'
      and expires_at <= now();

    if v_reservation_count = 0 then
      continue;
    end if;

    perform product.id
    from public.products as product
    join public.inventory_reservations as reservation on reservation.product_id = product.id
    where reservation.payment_attempt_id = v_candidate.attempt_id
      and reservation.status = 'reserved'
      and reservation.expires_at <= now()
    order by product.id
    for update of product;

    with quantities as (
      select product_id, sum(quantity)::integer as quantity
      from public.inventory_reservations
      where payment_attempt_id = v_candidate.attempt_id
        and status = 'reserved'
        and expires_at <= now()
      group by product_id
    )
    update public.products as product
    set inventory_count = product.inventory_count + quantities.quantity,
        updated_at = now()
    from quantities
    where product.id = quantities.product_id;

    update public.inventory_reservations
    set status = 'released',
        released_at = now(),
        release_reason = 'reservation_expired',
        updated_at = now()
    where payment_attempt_id = v_candidate.attempt_id
      and status = 'reserved'
      and expires_at <= now();

    update public.payment_attempts
    set status = 'released',
        failure_code = coalesce(failure_code, 'reservation_expired'),
        failure_message = coalesce(failure_message, 'Payment reservation expired before confirmation.'),
        initialization_claim_token = null,
        initialization_claim_expires_at = null,
        finalized_at = coalesce(finalized_at, now()),
        updated_at = now()
    where id = v_candidate.attempt_id
      and status not in ('succeeded', 'refund_pending', 'refunded', 'partially_refunded', 'review');

    update public.orders
    set payment_status = case when payment_status in ('pending', 'processing') then 'failed' else payment_status end,
        payment_failure_reason = case when payment_status in ('pending', 'processing') then 'reservation_expired' else payment_failure_reason end,
        updated_at = now()
    where id = v_candidate.order_id
      and payment_status not in ('paid', 'refund_pending', 'refunded', 'partially_refunded', 'review');

    insert into public.payment_events (
      payment_attempt_id,
      order_id,
      provider_domain,
      event_key,
      event_type,
      event_source,
      reference,
      outcome,
      outcome_reason,
      summary
    ) values (
      v_candidate.attempt_id,
      v_candidate.order_id,
      v_candidate.provider_domain,
      'reservation-expired:' || v_candidate.attempt_id::text,
      'reservation.expired',
      'system',
      v_candidate.reference,
      'applied',
      'reservation_expired',
      jsonb_build_object('reservationCount', v_reservation_count, 'releasedUnits', v_unit_count)
    )
    on conflict (event_key) do nothing;

    v_released_attempts := v_released_attempts + 1;
    v_released_reservations := v_released_reservations + v_reservation_count;
    v_released_units := v_released_units + v_unit_count;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'releasedAttempts', v_released_attempts,
    'releasedReservations', v_released_reservations,
    'releasedUnits', v_released_units
  );
end
$function$;

revoke all on function private.enqueue_payment_review_notifications(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.enqueue_payment_confirmation_notifications(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_payment_order(text, text, text, text, text, text, text, text, integer, jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.claim_paystack_initialization(text, text, integer) from public, anon, authenticated;
revoke all on function public.save_paystack_initialization(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.release_payment_attempt(text, text, text) from public, anon, authenticated;
revoke all on function public.finalize_paystack_payment(text, text, text, bigint, text, text, text, timestamptz, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_paystack_payment_status(text, text, text, text, text, text, bigint, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.release_expired_payment_reservations(integer) from public, anon, authenticated;

grant execute on function public.create_payment_order(text, text, text, text, text, text, text, text, integer, jsonb, text, integer) to service_role;
grant execute on function public.claim_paystack_initialization(text, text, integer) to service_role;
grant execute on function public.save_paystack_initialization(text, text, text, text, text, text) to service_role;
grant execute on function public.release_payment_attempt(text, text, text) to service_role;
grant execute on function public.finalize_paystack_payment(text, text, text, bigint, text, text, text, timestamptz, text, jsonb) to service_role;
grant execute on function public.record_paystack_payment_status(text, text, text, text, text, text, bigint, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.release_expired_payment_reservations(integer) to service_role;

comment on table public.payment_attempts is 'Server-only payment initialization and lifecycle records with idempotency and expected-money invariants.';
comment on table public.inventory_reservations is 'Stock decremented at checkout creation and captured or restored exactly once by payment RPCs.';
comment on table public.payment_events is 'Deduplicated payment event audit summaries; raw provider payloads are intentionally not stored.';
comment on table public.notification_outbox is 'Retryable, deduplicated server-only notifications emitted by committed payment transitions.';

commit;
