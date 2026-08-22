-- Production test-payment cleanup review script.
--
-- Run this only in the Supabase SQL editor for the intended hosted project
-- after a database backup has completed. The preview SELECTs at the top are
-- intentionally outside the destructive transaction.
--
-- This script targets the new Paystack payment flow's test-domain attempts and
-- legacy test-like orders with Paystack test references. It does not delete
-- products, categories, staff, newsletter subscribers, or site media.

-- 1) Preview what would be removed.
select
  count(*) as test_payment_attempts
from public.payment_attempts
where provider = 'paystack'
  and provider_domain = 'test';

select
  count(distinct orders.id) as orders_linked_to_test_attempts
from public.orders as orders
join public.payment_attempts as attempt on attempt.order_id = orders.id
where attempt.provider = 'paystack'
  and attempt.provider_domain = 'test';

select
  count(*) as legacy_test_like_orders
from public.orders
where paystack_reference like 'TST_%'
   or paystack_reference like 'test_%'
   or reference like 'ekana\_%' escape '\';

-- 2) Stop here and review counts before continuing.
-- 3) Uncomment and run the transaction below only after explicit approval.

/*
begin;

create schema if not exists private_cleanup;

create temporary table cleanup_test_attempts as
select id, order_id
from public.payment_attempts
where provider = 'paystack'
  and provider_domain = 'test';

create temporary table cleanup_test_orders as
select order_id as id from cleanup_test_attempts
union
select id
from public.orders
where paystack_reference like 'TST_%'
   or paystack_reference like 'test_%'
   or reference like 'ekana\_%' escape '\';

create table if not exists private_cleanup.payment_cleanup_backup as
select now() as backed_up_at, 'orders'::text as source_table, to_jsonb(orders.*) as row_data
from public.orders
where false;

insert into private_cleanup.payment_cleanup_backup (backed_up_at, source_table, row_data)
select now(), 'orders', to_jsonb(orders.*)
from public.orders as orders
where orders.id in (select id from cleanup_test_orders);

insert into private_cleanup.payment_cleanup_backup (backed_up_at, source_table, row_data)
select now(), 'payment_attempts', to_jsonb(attempt.*)
from public.payment_attempts as attempt
where attempt.id in (select id from cleanup_test_attempts);

insert into private_cleanup.payment_cleanup_backup (backed_up_at, source_table, row_data)
select now(), 'inventory_reservations', to_jsonb(reservation.*)
from public.inventory_reservations as reservation
where reservation.payment_attempt_id in (select id from cleanup_test_attempts);

insert into private_cleanup.payment_cleanup_backup (backed_up_at, source_table, row_data)
select now(), 'payment_events', to_jsonb(event.*)
from public.payment_events as event
where event.payment_attempt_id in (select id from cleanup_test_attempts)
   or event.order_id in (select id from cleanup_test_orders);

insert into private_cleanup.payment_cleanup_backup (backed_up_at, source_table, row_data)
select now(), 'notification_outbox', to_jsonb(notification.*)
from public.notification_outbox as notification
where notification.payment_attempt_id in (select id from cleanup_test_attempts)
   or notification.order_id in (select id from cleanup_test_orders);

delete from public.notification_outbox
where payment_attempt_id in (select id from cleanup_test_attempts)
   or order_id in (select id from cleanup_test_orders);

delete from public.payment_events
where payment_attempt_id in (select id from cleanup_test_attempts)
   or order_id in (select id from cleanup_test_orders);

delete from public.inventory_reservations
where payment_attempt_id in (select id from cleanup_test_attempts);

delete from public.payment_attempts
where id in (select id from cleanup_test_attempts);

delete from public.orders
where id in (select id from cleanup_test_orders);

commit;
*/
