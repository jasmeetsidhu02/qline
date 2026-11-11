-- =====================================================================
-- QLine — M3: staff queue functions
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 001_init.sql)
--
-- Why functions instead of the app updating rows directly?
--   "Next" is really two changes (finish the current customer, call the
--   next one). Doing both inside one database function means they happen
--   together or not at all, even on a bad network, and two phones tapping
--   Next at the same moment can't call the same customer twice.
-- Every function first checks is_shop_member(): only that shop's staff.
-- =====================================================================


-- Everything the dashboard needs, in one call.
create or replace function public.get_staff_queue(p_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_shop  shops%rowtype;
  v_today date;
begin
  if not is_shop_member(p_shop_id) then raise exception 'NOT_ALLOWED'; end if;
  select * into v_shop from shops where id = p_shop_id;
  v_today := shop_today(v_shop.timezone);

  return jsonb_build_object(
    -- The server's clock, so "waiting 12 min" is right even if the phone's clock is wrong.
    'server_now', now(),
    'serving', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'ticket_no', q.ticket_no, 'name', q.customer_name,
               'phone', q.phone, 'source', q.source,
               'joined_at', q.joined_at, 'called_at', q.called_at)
             order by q.called_at)
      from queue_entries q
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'serving'), '[]'::jsonb),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'ticket_no', q.ticket_no, 'name', q.customer_name,
               'phone', q.phone, 'source', q.source,
               'joined_at', q.joined_at, 'called_at', q.called_at)
             order by q.joined_at, q.ticket_no)
      from queue_entries q
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'waiting'), '[]'::jsonb),
    'done_today', (
      select count(*) from queue_entries q
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'done'),
    'no_show_today', (
      select count(*) from queue_entries q
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'no_show')
  );
end $$;


-- The "Next" button.
--   * Calls the next waiting customer (or a specific one if p_entry_id is given).
--   * If every chair is busy, the customer who has been in the chair longest
--     is marked done first. "Chairs" = number of active barbers (at least 1).
--   * If nobody is waiting, it just finishes the current customer.
create or replace function public.call_next(p_shop_id uuid, p_entry_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shop      shops%rowtype;
  v_today     date;
  v_next      queue_entries%rowtype;
  v_chairs    int;
  v_serving   int;
  v_finished  int;
begin
  if not is_shop_member(p_shop_id) then raise exception 'NOT_ALLOWED'; end if;
  select * into v_shop from shops where id = p_shop_id;
  v_today := shop_today(v_shop.timezone);

  -- One "Next" at a time per shop.
  perform pg_advisory_xact_lock(hashtext(p_shop_id::text));

  if p_entry_id is not null then
    select * into v_next from queue_entries
    where id = p_entry_id and shop_id = p_shop_id
      and queue_date = v_today and status = 'waiting';
    if not found then raise exception 'ENTRY_NOT_FOUND'; end if;
  else
    select * into v_next from queue_entries
    where shop_id = p_shop_id and queue_date = v_today and status = 'waiting'
    order by joined_at, ticket_no
    limit 1;
  end if;

  select greatest(count(*), 1) into v_chairs
  from barbers where shop_id = p_shop_id and is_active;

  select count(*) into v_serving
  from queue_entries
  where shop_id = p_shop_id and queue_date = v_today and status = 'serving';

  if v_serving >= v_chairs or (v_next.id is null and v_serving > 0) then
    update queue_entries
    set status = 'done', finished_at = now()
    where id = (
      select id from queue_entries
      where shop_id = p_shop_id and queue_date = v_today and status = 'serving'
      order by called_at
      limit 1)
    returning ticket_no into v_finished;
  end if;

  if v_next.id is not null then
    update queue_entries set status = 'serving', called_at = now() where id = v_next.id;
  end if;

  return jsonb_build_object('called_ticket', v_next.ticket_no, 'finished_ticket', v_finished);
end $$;


-- "Done" / "No-show" on one customer (in the chair or still waiting).
create or replace function public.finish_entry(p_entry_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid;
begin
  if p_status not in ('done', 'no_show') then raise exception 'INVALID_STATUS'; end if;

  select shop_id into v_shop_id from queue_entries where id = p_entry_id;
  if not found then raise exception 'ENTRY_NOT_FOUND'; end if;
  if not is_shop_member(v_shop_id) then raise exception 'NOT_ALLOWED'; end if;

  update queue_entries
  set status = p_status::entry_status, finished_at = now()
  where id = p_entry_id and status in ('waiting', 'serving');
  return found;
end $$;


-- Barber adds someone who walked in without scanning the QR code.
-- Phone is optional (many walk-ins won't give one).
create or replace function public.add_walk_in(
  p_shop_id     uuid,
  p_name        text,
  p_phone       text default null,
  p_service_id  uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shop    shops%rowtype;
  v_today   date;
  v_name    text := btrim(coalesce(p_name, ''));
  v_phone   text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_dup     int;
  v_ticket  int;
begin
  if not is_shop_member(p_shop_id) then raise exception 'NOT_ALLOWED'; end if;
  select * into v_shop from shops where id = p_shop_id;

  if char_length(v_name) not between 1 and 40 then raise exception 'INVALID_NAME'; end if;
  if v_phone is not null and v_phone !~ '^[0-9]{10}$' then raise exception 'INVALID_PHONE'; end if;
  if p_service_id is not null and not exists (
    select 1 from services where id = p_service_id and shop_id = p_shop_id and is_active
  ) then raise exception 'INVALID_SERVICE'; end if;

  v_today := shop_today(v_shop.timezone);
  perform pg_advisory_xact_lock(hashtext(p_shop_id::text));

  if v_phone is not null then
    select q.ticket_no into v_dup from queue_entries q
    where q.shop_id = p_shop_id and q.queue_date = v_today
      and q.phone = v_phone and q.status in ('waiting', 'serving')
    limit 1;
    if found then raise exception 'ALREADY_IN_QUEUE:%', v_dup; end if;
  end if;

  select coalesce(max(q.ticket_no), 0) + 1 into v_ticket
  from queue_entries q
  where q.shop_id = p_shop_id and q.queue_date = v_today;

  insert into queue_entries (shop_id, queue_date, ticket_no, customer_name, phone, service_id, source)
  values (p_shop_id, v_today, v_ticket, v_name, v_phone, p_service_id, 'walk_in');

  return jsonb_build_object('ticket_no', v_ticket);
end $$;


-- Only logged-in users may call these (and each one checks shop membership).
revoke execute on function public.get_staff_queue(uuid)               from public, anon;
revoke execute on function public.call_next(uuid, uuid)               from public, anon;
revoke execute on function public.finish_entry(uuid, text)            from public, anon;
revoke execute on function public.add_walk_in(uuid, text, text, uuid) from public, anon;

grant execute on function public.get_staff_queue(uuid)               to authenticated;
grant execute on function public.call_next(uuid, uuid)               to authenticated;
grant execute on function public.finish_entry(uuid, text)            to authenticated;
grant execute on function public.add_walk_in(uuid, text, text, uuid) to authenticated;
