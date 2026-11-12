-- =====================================================================
-- QLine — M8: surviving a real day in the shop
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 007)
--
-- Three things that only show up once a shop uses this every day:
--   * a wrong tap. Done and No-show were final; now they can be taken back
--     for 15 minutes.
--   * yesterday. Nobody taps Done on the last customer when they close.
--     Those rows sat as "waiting" and "serving" forever, so the shop's
--     average cut time was poisoned and old customers' phones still said
--     "you're next".
--   * a customer whose ticket is from a day that has already ended, who
--     should be told plainly instead of watching a frozen screen.
-- =====================================================================


-- Take back a wrong Done or No-show.
--
-- Only for today, only within 15 minutes, and only by this shop's staff.
-- Where the customer goes back to depends on how far they had got: someone
-- who had been called returns to the chair, someone who never was returns
-- to the line.
create or replace function public.undo_entry(p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_entry  queue_entries%rowtype;
  v_shop   shops%rowtype;
  v_back   entry_status;
begin
  select * into v_entry from queue_entries where id = p_entry_id;
  if not found then raise exception 'ENTRY_NOT_FOUND'; end if;
  if not is_shop_member(v_entry.shop_id) then raise exception 'NOT_ALLOWED'; end if;

  select * into v_shop from shops where id = v_entry.shop_id;
  if v_entry.queue_date <> shop_today(v_shop.timezone) then raise exception 'TOO_LATE'; end if;
  if v_entry.status not in ('done', 'no_show') then raise exception 'NOTHING_TO_UNDO'; end if;
  if v_entry.finished_at is not null and v_entry.finished_at < now() - interval '15 minutes' then
    raise exception 'TOO_LATE';
  end if;

  v_back := case when v_entry.called_at is not null then 'serving' else 'waiting' end;

  update queue_entries
  set status = v_back,
      finished_at = null
  where id = p_entry_id;

  return jsonb_build_object('ticket_no', v_entry.ticket_no, 'status', v_back);
end $$;


-- Close off any day that has already ended.
--
-- Called when the dashboard opens and again inside every Next, so a shop
-- that never closes the app still starts each morning with a clean board.
-- Nobody is "no-showed" today by this: it only touches earlier days.
create or replace function public.close_old_days(p_shop_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_shop   shops%rowtype;
  v_today  date;
  v_closed int := 0;
  v_n      int;
begin
  if not is_shop_member(p_shop_id) then raise exception 'NOT_ALLOWED'; end if;
  select * into v_shop from shops where id = p_shop_id;
  v_today := shop_today(v_shop.timezone);

  -- Still in a chair when the shop closed: the cut happened, so it counts
  -- as done. shop_service_minutes already throws away anything over two
  -- hours, so this cannot poison the shop's average.
  update queue_entries
  set status = 'done', finished_at = coalesce(finished_at, now())
  where shop_id = p_shop_id and queue_date < v_today and status = 'serving';
  get diagnostics v_n = row_count;
  v_closed := v_closed + v_n;

  -- Still waiting when the shop closed: they went home.
  update queue_entries
  set status = 'no_show', finished_at = coalesce(finished_at, now())
  where shop_id = p_shop_id and queue_date < v_today and status = 'waiting';
  get diagnostics v_n = row_count;
  v_closed := v_closed + v_n;

  return v_closed;
end $$;


-- Next, now closing off any earlier day first.
drop function if exists public.call_next(uuid, uuid);
create or replace function public.call_next(
  p_shop_id   uuid,
  p_entry_id  uuid default null,
  p_barber_id uuid default null
)
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

  if p_barber_id is not null and not exists (
    select 1 from barbers where id = p_barber_id and shop_id = p_shop_id and is_active
  ) then raise exception 'INVALID_BARBER'; end if;

  -- One "Next" at a time per shop.
  perform pg_advisory_xact_lock(hashtext(p_shop_id::text));

  -- Yesterday's leftovers must not be picked up as today's next customer.
  perform close_old_days(p_shop_id);

  if p_entry_id is not null then
    select * into v_next from queue_entries
    where id = p_entry_id and shop_id = p_shop_id
      and queue_date = v_today and status = 'waiting';
    if not found then raise exception 'ENTRY_NOT_FOUND'; end if;
  else
    -- When a particular barber is free, serve whoever asked for them first,
    -- then fall back to people happy with anyone.
    select * into v_next from queue_entries
    where shop_id = p_shop_id and queue_date = v_today and status = 'waiting'
      and (p_barber_id is null
           or preferred_barber_id is null
           or preferred_barber_id = p_barber_id)
    order by
      case when p_barber_id is not null and preferred_barber_id = p_barber_id then 0 else 1 end,
      joined_at, ticket_no
    limit 1;
  end if;

  select greatest(count(*), 1) into v_chairs
  from barbers where shop_id = p_shop_id and is_active;

  select count(*) into v_serving
  from queue_entries
  where shop_id = p_shop_id and queue_date = v_today and status = 'serving';

  -- Free a chair when they are all busy. If a specific barber is calling,
  -- finish that barber's own customer rather than the oldest one anywhere.
  if v_serving >= v_chairs or (v_next.id is null and v_serving > 0) then
    update queue_entries
    set status = 'done', finished_at = now()
    where id = (
      select id from queue_entries
      where shop_id = p_shop_id and queue_date = v_today and status = 'serving'
        and (p_barber_id is null or served_by_barber_id = p_barber_id)
      order by called_at
      limit 1)
    returning ticket_no into v_finished;
  end if;

  if v_next.id is not null then
    update queue_entries
    set status = 'serving', called_at = now(), served_by_barber_id = p_barber_id
    where id = v_next.id;
  end if;

  return jsonb_build_object('called_ticket', v_next.ticket_no, 'finished_ticket', v_finished);
end $$;


-- The customer's own screen, now honest about a ticket from an earlier day.
create or replace function public.get_my_status(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_entry   queue_entries%rowtype;
  v_shop    shops%rowtype;
  v_ahead   int := 0;
  v_wait    int := 0;
  v_status  text;
begin
  select * into v_entry from queue_entries where customer_token = p_token;
  if not found then return null; end if;
  select * into v_shop from shops where id = v_entry.shop_id;

  v_status := v_entry.status::text;

  -- The shop's day has rolled over and this ticket never finished. Say so,
  -- rather than leaving a phone showing a place in a line that is gone.
  if v_entry.queue_date < shop_today(v_shop.timezone)
     and v_entry.status in ('waiting', 'serving') then
    v_status := 'expired';
  end if;

  if v_status = 'waiting' then
    select count(*) into v_ahead
    from queue_entries q
    where q.shop_id = v_entry.shop_id
      and q.queue_date = v_entry.queue_date
      and q.status = 'waiting'
      and (q.joined_at, q.ticket_no) < (v_entry.joined_at, v_entry.ticket_no)
      -- In pick-barber mode, only people waiting for the same barber
      -- (or for "anyone") are ahead of you.
      and (v_entry.preferred_barber_id is null
           or q.preferred_barber_id is null
           or q.preferred_barber_id = v_entry.preferred_barber_id);

    v_wait := estimate_wait_minutes(
      v_entry.shop_id, v_entry.queue_date, v_ahead, v_entry.preferred_barber_id);
  end if;

  return jsonb_build_object(
    'ticket_no',      v_entry.ticket_no,
    'status',         v_status,
    'people_ahead',   v_ahead,
    'est_wait_min',   v_wait,
    'shop_name',      v_shop.name,
    'shop_slug',      v_shop.slug,
    'shop_id',        v_shop.id,
    'shop_is_open',   v_shop.is_open,
    'now_serving',    coalesce((
                        select jsonb_agg(q.ticket_no order by q.called_at)
                        from queue_entries q
                        where q.shop_id = v_entry.shop_id
                          and q.queue_date = v_entry.queue_date
                          and q.status = 'serving'), '[]'::jsonb)
  );
end $$;


revoke execute on function public.undo_entry(uuid)     from public, anon;
grant  execute on function public.undo_entry(uuid)     to authenticated;
revoke execute on function public.close_old_days(uuid) from public, anon;
grant  execute on function public.close_old_days(uuid) to authenticated;
revoke execute on function public.call_next(uuid, uuid, uuid) from public, anon;
grant  execute on function public.call_next(uuid, uuid, uuid) to authenticated;
