-- Run AFTER 001_init.sql, in a new SQL Editor tab, one block at a time.
-- (The SQL Editor runs as the database admin, so it skips RLS. That's fine
-- for testing the functions; real security is tested from the app.)

-- 1) Create an open demo shop with no owner yet (M2 adds real owners).
insert into shops (slug, name, is_open) values ('demo', 'Demo Salon', true);

-- 2) Three customers join. Each returns a ticket_no and a secret customer_token.
select join_queue('demo', 'Aman Singh', '9876543210');
select join_queue('demo', 'Bob', '9876500000');
select join_queue('demo', 'Charan', '9876511111');

-- 3) Try a duplicate phone → should fail with ALREADY_IN_QUEUE:1
select join_queue('demo', 'Aman', '9876543210');

-- 4) What the TV screen would show (first names only):
select get_public_queue('demo');

-- 5) Copy Charan's customer_token from step 2 and paste it here:
select get_my_status('PASTE-TOKEN-HERE');
-- Expect: people_ahead = 2, status = waiting

-- 6) Pretend the barber called #1:
update queue_entries set status = 'serving', called_at = now() where ticket_no = 1;
select get_my_status('PASTE-TOKEN-HERE');
-- Expect: people_ahead = 1, now_serving = [1]

-- 7) Clean up the test customers (keeps the demo shop for the app):
-- delete from queue_entries where shop_id = (select id from shops where slug = 'demo');
