begin;

insert into public.products (
  id,
  slug,
  name,
  description,
  category,
  price,
  image_url,
  inventory_count,
  is_active
) values (
  'sqltest-payment-product',
  'sqltest-payment-product',
  'SQL payment test product',
  'Rollback-only payment state-machine fixture.',
  'Test',
  100,
  'https://example.test/payment-product.jpg',
  100,
  true
);

insert into public.orders (
  id,
  reference,
  customer_email,
  customer_name,
  customer_phone,
  delivery_address,
  delivery_city,
  subtotal,
  delivery_fee,
  total,
  payment_status,
  paystack_reference,
  items,
  paid_at
) values
  (
    '00000000-0000-0000-0000-000000000101',
    'sqltest-review',
    'review@example.test',
    'Review Test',
    '08000000001',
    '1 Test Street',
    'Lagos',
    100,
    0,
    100,
    'paid',
    'sqltest-review',
    '[]'::jsonb,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'sqltest-reversal',
    'reversal@example.test',
    'Reversal Test',
    '08000000002',
    '2 Test Street',
    'Lagos',
    100,
    0,
    100,
    'pending',
    'sqltest-reversal',
    '[]'::jsonb,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'sqltest-terminal',
    'terminal@example.test',
    'Terminal Test',
    '08000000003',
    '3 Test Street',
    'Lagos',
    100,
    0,
    100,
    'failed',
    'sqltest-terminal',
    '[]'::jsonb,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    'sqltest-tx-owner',
    'owner@example.test',
    'Transaction Owner',
    '08000000004',
    '4 Test Street',
    'Lagos',
    100,
    0,
    100,
    'paid',
    'sqltest-tx-owner',
    '[]'::jsonb,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    'sqltest-tx-conflict',
    'conflict@example.test',
    'Transaction Conflict',
    '08000000005',
    '5 Test Street',
    'Lagos',
    100,
    0,
    100,
    'pending',
    'sqltest-tx-conflict',
    '[]'::jsonb,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000106',
    'sqltest-refund',
    'refund@example.test',
    'Refund Test',
    '08000000006',
    '6 Test Street',
    'Lagos',
    100,
    0,
    100,
    'paid',
    'sqltest-refund',
    '[]'::jsonb,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000107',
    'sqltest-reversal-pending-paid',
    'reversal-pending-paid@example.test',
    'Paid Reversal Pending Test',
    '08000000007',
    '7 Test Street',
    'Lagos',
    100,
    0,
    100,
    'paid',
    'sqltest-reversal-pending-paid',
    '[]'::jsonb,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000108',
    'sqltest-reversal-pending-unpaid',
    'reversal-pending-unpaid@example.test',
    'Unpaid Reversal Pending Test',
    '08000000008',
    '8 Test Street',
    'Lagos',
    100,
    0,
    100,
    'pending',
    'sqltest-reversal-pending-unpaid',
    '[]'::jsonb,
    null
  );

insert into public.payment_attempts (
  id,
  order_id,
  provider_domain,
  reference,
  idempotency_key,
  request_fingerprint,
  expected_amount_kobo,
  currency,
  status,
  provider_transaction_id,
  expires_at,
  paid_at
) values
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'test',
    'sqltest-review',
    'sqltest-idempotency-review',
    repeat('1', 64),
    10000,
    'NGN',
    'succeeded',
    'sqltest-tx-review',
    now() + interval '30 minutes',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    'test',
    'sqltest-reversal',
    'sqltest-idempotency-reversal',
    repeat('2', 64),
    10000,
    'NGN',
    'pending',
    null,
    now() + interval '30 minutes',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000103',
    'test',
    'sqltest-terminal',
    'sqltest-idempotency-terminal',
    repeat('3', 64),
    10000,
    'NGN',
    'released',
    null,
    now() - interval '1 minute',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000104',
    'test',
    'sqltest-tx-owner',
    'sqltest-idempotency-tx-owner',
    repeat('4', 64),
    10000,
    'NGN',
    'succeeded',
    'sqltest-tx-shared',
    now() + interval '30 minutes',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000205',
    '00000000-0000-0000-0000-000000000105',
    'test',
    'sqltest-tx-conflict',
    'sqltest-idempotency-tx-conflict',
    repeat('5', 64),
    10000,
    'NGN',
    'pending',
    null,
    now() + interval '30 minutes',
    null
  ),
  (
    '00000000-0000-0000-0000-000000000206',
    '00000000-0000-0000-0000-000000000106',
    'test',
    'sqltest-refund',
    'sqltest-idempotency-refund',
    repeat('6', 64),
    10000,
    'NGN',
    'succeeded',
    null,
    now() + interval '30 minutes',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000207',
    '00000000-0000-0000-0000-000000000107',
    'test',
    'sqltest-reversal-pending-paid',
    'sqltest-idempotency-reversal-pending-paid',
    repeat('7', 64),
    10000,
    'NGN',
    'succeeded',
    'sqltest-tx-reversal-pending-paid',
    now() + interval '30 minutes',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000208',
    '00000000-0000-0000-0000-000000000108',
    'test',
    'sqltest-reversal-pending-unpaid',
    'sqltest-idempotency-reversal-pending-unpaid',
    repeat('8', 64),
    10000,
    'NGN',
    'pending',
    'sqltest-tx-reversal-pending-unpaid',
    now() + interval '30 minutes',
    null
  );

insert into public.inventory_reservations (
  order_id,
  payment_attempt_id,
  product_id,
  quantity,
  status,
  expires_at,
  captured_at,
  released_at,
  release_reason
) values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000201',
    'sqltest-payment-product',
    1,
    'captured',
    now() + interval '30 minutes',
    now(),
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000202',
    'sqltest-payment-product',
    1,
    'reserved',
    now() + interval '30 minutes',
    null,
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000203',
    'sqltest-payment-product',
    1,
    'released',
    now() - interval '1 minute',
    null,
    now(),
    'test_fixture'
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000204',
    'sqltest-payment-product',
    1,
    'captured',
    now() + interval '30 minutes',
    now(),
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000205',
    'sqltest-payment-product',
    1,
    'reserved',
    now() + interval '30 minutes',
    null,
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000206',
    'sqltest-payment-product',
    1,
    'captured',
    now() + interval '30 minutes',
    now(),
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000107',
    '00000000-0000-0000-0000-000000000207',
    'sqltest-payment-product',
    1,
    'captured',
    now() + interval '30 minutes',
    now(),
    null,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000108',
    '00000000-0000-0000-0000-000000000208',
    'sqltest-payment-product',
    1,
    'reserved',
    now() + interval '30 minutes',
    null,
    null,
    null
  );

do $payment_state_machine_tests$
declare
  v_result jsonb;
begin
  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-review',
    p_event_key => 'sqltest-event-dispute-create',
    p_event_type => 'charge.dispute.create',
    p_provider_status => 'dispute_opened',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-review',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'webhook',
    p_event_summary => '{"disputeId":"sqltest-dispute"}'::jsonb
  );

  if v_result ->> 'attemptStatus' is distinct from 'review'
    or v_result ->> 'orderPaymentStatus' is distinct from 'review' then
    raise exception 'dispute create did not enter review: %', v_result;
  end if;

  v_result := public.finalize_paystack_payment(
    p_reference => 'sqltest-review',
    p_event_key => 'sqltest-event-late-exact-success',
    p_provider_transaction_id => 'sqltest-tx-review',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_provider_status => 'success',
    p_provider_domain => 'test',
    p_event_source => 'webhook'
  );

  if v_result ->> 'eventOutcome' is distinct from 'ignored'
    or v_result ->> 'attemptStatus' is distinct from 'review'
    or v_result ->> 'orderPaymentStatus' is distinct from 'review' then
    raise exception 'review was not sticky after exact success: %', v_result;
  end if;

  perform public.record_paystack_payment_status(
    p_reference => 'sqltest-review',
    p_event_key => 'sqltest-event-dispute-resolve',
    p_event_type => 'charge.dispute.resolve',
    p_provider_status => 'dispute_resolved',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-review',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'webhook'
  );

  if not exists (
    select 1
    from public.notification_outbox
    where payment_attempt_id = '00000000-0000-0000-0000-000000000201'
      and template_key = 'admin_payment_review'
      and recipient = 'ORDER_NOTIFICATION_EMAIL'
  ) then
    raise exception 'durable admin review outbox row was not created';
  end if;

  perform public.record_paystack_payment_status(
    p_reference => 'sqltest-reversal',
    p_event_key => 'sqltest-event-unpaid-reversal',
    p_event_type => 'charge.reversed',
    p_provider_status => 'reversed',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-reversal',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'webhook'
  );

  v_result := public.finalize_paystack_payment(
    p_reference => 'sqltest-reversal',
    p_event_key => 'sqltest-event-success-after-reversal',
    p_provider_transaction_id => 'sqltest-tx-reversal',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_provider_status => 'success',
    p_provider_domain => 'test',
    p_event_source => 'webhook'
  );

  if v_result ->> 'eventOutcome' is distinct from 'ignored'
    or v_result ->> 'attemptStatus' is distinct from 'review'
    or v_result ->> 'orderPaymentStatus' is distinct from 'reversed'
    or (
      select status
      from public.inventory_reservations
      where payment_attempt_id = '00000000-0000-0000-0000-000000000202'
    ) is distinct from 'reserved' then
    raise exception 'success after unpaid reversal captured or paid the order: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-reversal',
    p_event_key => 'sqltest-event-refund-after-reversal-race',
    p_event_type => 'refund.processed',
    p_provider_status => 'processed',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-refund-after-reversal',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'webhook'
  );

  if v_result ->> 'attemptStatus' is distinct from 'refunded'
    or v_result ->> 'orderPaymentStatus' is distinct from 'refunded'
    or (
      select status
      from public.inventory_reservations
      where payment_attempt_id = '00000000-0000-0000-0000-000000000202'
    ) is distinct from 'released'
    or (
      select inventory_count
      from public.products
      where id = 'sqltest-payment-product'
    ) is distinct from 101 then
    raise exception 'processed refund did not release stranded reserved inventory: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-terminal',
    p_event_key => 'sqltest-event-pending-after-release',
    p_event_type => 'charge.pending',
    p_provider_status => 'pending',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-terminal',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'verification'
  );

  if v_result ->> 'eventOutcome' is distinct from 'ignored'
    or v_result ->> 'attemptStatus' is distinct from 'released'
    or v_result ->> 'orderPaymentStatus' is distinct from 'failed' then
    raise exception 'pending event regressed a terminal unpaid state: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-tx-conflict',
    p_event_key => 'sqltest-event-cross-attempt-conflict',
    p_event_type => 'charge.pending',
    p_provider_status => 'pending',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-shared',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'verification'
  );

  if v_result ->> 'eventOutcome' is distinct from 'rejected'
    or v_result ->> 'eventReason' is distinct from 'provider_transaction_claimed_by_another_attempt'
    or v_result ->> 'attemptStatus' is distinct from 'review'
    or v_result ->> 'orderPaymentStatus' is distinct from 'review' then
    raise exception 'cross-attempt transaction conflict was not durable review: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-refund',
    p_event_key => 'sqltest-event-refund-reference',
    p_event_type => 'refund.pending',
    p_provider_status => 'pending',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-refund-reference',
    p_amount_kobo => 5000,
    p_currency => 'NGN',
    p_event_source => 'webhook'
  );

  if v_result ->> 'attemptStatus' is distinct from 'refund_pending'
    or (
      select provider_transaction_id
      from public.payment_attempts
      where id = '00000000-0000-0000-0000-000000000206'
    ) is not null
    or (
      select provider_transaction_id
      from public.payment_events
      where event_key = 'sqltest-event-refund-reference'
    ) is distinct from 'sqltest-refund-reference' then
    raise exception 'refund reference contaminated payment transaction identity: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-reversal-pending-paid',
    p_event_key => 'sqltest-event-paid-reversal-pending',
    p_event_type => 'transaction.verify',
    p_provider_status => 'reversal_pending',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-reversal-pending-paid',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'verification'
  );

  if v_result ->> 'attemptStatus' is distinct from 'refund_pending'
    or v_result ->> 'orderPaymentStatus' is distinct from 'refund_pending' then
    raise exception 'paid reversal pending did not enter refund pending: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-reversal-pending-paid',
    p_event_key => 'sqltest-event-paid-reversal-complete',
    p_event_type => 'transaction.verify',
    p_provider_status => 'reversed',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-reversal-pending-paid',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'verification'
  );

  if v_result ->> 'attemptStatus' is distinct from 'review'
    or v_result ->> 'orderPaymentStatus' is distinct from 'reversed'
    or (
      select status
      from public.inventory_reservations
      where payment_attempt_id = '00000000-0000-0000-0000-000000000207'
    ) is distinct from 'captured' then
    raise exception 'completed paid reversal did not preserve captured stock for review: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-reversal-pending-unpaid',
    p_event_key => 'sqltest-event-unpaid-reversal-pending',
    p_event_type => 'transaction.verify',
    p_provider_status => 'reversal_pending',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-reversal-pending-unpaid',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'verification'
  );

  if v_result ->> 'attemptStatus' is distinct from 'review'
    or v_result ->> 'orderPaymentStatus' is distinct from 'review' then
    raise exception 'unpaid reversal pending did not enter review: %', v_result;
  end if;

  v_result := public.record_paystack_payment_status(
    p_reference => 'sqltest-reversal-pending-unpaid',
    p_event_key => 'sqltest-event-unpaid-reversal-complete',
    p_event_type => 'transaction.verify',
    p_provider_status => 'reversed',
    p_provider_domain => 'test',
    p_provider_transaction_id => 'sqltest-tx-reversal-pending-unpaid',
    p_amount_kobo => 10000,
    p_currency => 'NGN',
    p_event_source => 'verification'
  );

  if v_result ->> 'attemptStatus' is distinct from 'cancelled'
    or v_result ->> 'orderPaymentStatus' is distinct from 'reversed'
    or (
      select status
      from public.inventory_reservations
      where payment_attempt_id = '00000000-0000-0000-0000-000000000208'
    ) is distinct from 'reserved' then
    raise exception 'completed unpaid reversal was not made safe to release: %', v_result;
  end if;

  v_result := public.release_payment_attempt(
    p_reference => 'sqltest-reversal-pending-unpaid',
    p_reason => 'sqltest_reversal_complete'
  );

  if v_result ->> 'attemptStatus' is distinct from 'released'
    or v_result ->> 'orderPaymentStatus' is distinct from 'reversed'
    or (
      select status
      from public.inventory_reservations
      where payment_attempt_id = '00000000-0000-0000-0000-000000000208'
    ) is distinct from 'released'
    or (
      select inventory_count
      from public.products
      where id = 'sqltest-payment-product'
    ) is distinct from 102 then
    raise exception 'completed unpaid reversal did not release reserved stock: %', v_result;
  end if;
end
$payment_state_machine_tests$;

rollback;
