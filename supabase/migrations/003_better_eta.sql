-- =====================================================================
-- QLine — M5a: realistic waiting-time estimate
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 001_init.sql and 002_staff_queue.sql)
--
-- The old estimate was: people_ahead × service_minutes ÷ barbers.
-- That says 0 minutes when you are next, even though someone is still
-- in the chair. The new one also counts the customer being served now,
-- and learns how long cuts actually take in this shop.
-- =====================================================================


-- How long one customer takes at this shop, in minutes.
-- Uses the last 20 finished cuts (3 or more needed to trust it),
-- otherwise the number the owner set in settings.
-- Silly values are ignored: under 2 minutes (a mis-tap) or over 2 hours
-- (the barber forgot to tap Done and the customer left hours ago).
create or replace function public.shop_service_minutes(p_shop_id uuid)
returns int language sql stable security definer set search_path = public as $$
  with recent as (
    select extract(epoch from (finished_at - called_at)) / 60 as mins
    from queue_entries
    where shop_id = p_shop_id
      and status = 'done'
      and called_at is not null
      and finished_at is not null
      and finished_at > now() - interval '21 days'
      and (finished_at - called_at) between interval '2 minutes' and interval '2 hours'
    order by finished_at desc
    limit 20
  )
  select least(greatest(coalesce(
    (select round(avg(mins))::int from recent having count(*) >= 3),
    (select default_service_minutes from shops where id = p_shop_id),
    20
  ), 5), 180);
$$;


-- Minutes until it is this customer's turn.
--
-- Think of each barber's chair as becoming free at some time:
--   * a busy chair frees when its customer's cut is done
--     (service time minus how long they have been sitting, never below 0)
--   * an empty chair is free right now (0 minutes)
-- Then hand the people ahead, one at a time, to whichever chair frees
-- first, adding one service time to that chair. Whatever the earliest
-- free chair is after that, is this customer's wait.
--
-- Example, 1 chair, 20-minute cuts, someone 5 minutes into their cut:
--   chair frees in 15 min → next customer waits ~15 min (not 0).
create or replace function public.estimate_wait_minutes(
  p_shop_id     uuid,
  p_queue_date  date,
  p_ahead       int,
  p_barber_id   uuid default null   -- set when waiting for one named barber
)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  v_svc     int;
  v_chairs  int;
  v_busy    int;
  v_free    int;
  v_times   numeric[];
  v_i       int;
  v_idx     int;
  v_wait    numeric;
begin
  v_svc := shop_service_minutes(p_shop_id);

  if p_barber_id is not null then
    v_chairs := 1;   -- only that barber's chair counts
  else
    select greatest(count(*), 1) into v_chairs
    from barbers where shop_id = p_shop_id and is_active;
  end if;

  -- Minutes left for each customer currently in a chair. When waiting for
  -- one named barber, only that barber's customer counts.
  select coalesce(
           array_agg(greatest(0, v_svc - extract(epoch from (now() - called_at)) / 60)
                     order by called_at),
           '{}')
    into v_times
  from queue_entries
  where shop_id = p_shop_id and queue_date = p_queue_date and status = 'serving'
    and (p_barber_id is null
         or coalesce(served_by_barber_id, preferred_barber_id) = p_barber_id);

  v_busy := coalesce(array_length(v_times, 1), 0);
  v_free := greatest(v_chairs - v_busy, 0);

  for v_i in 1..v_free loop
    v_times := array_append(v_times, 0::numeric);
  end loop;

  if coalesce(array_length(v_times, 1), 0) = 0 then
    v_times := array[0::numeric];
  end if;

  -- Give each person ahead the chair that frees first.
  for v_i in 1..p_ahead loop
    select i into v_idx
    from generate_subscripts(v_times, 1) i
    order by v_times[i]
    limit 1;
    v_times[v_idx] := v_times[v_idx] + v_svc;
  end loop;

  select min(v_times[i]) into v_wait from generate_subscripts(v_times, 1) i;

  -- Every chair is busy, so it is never really "no wait" — show at least
  -- a minute, even when the barber is running over the usual time.
  if v_free = 0 and v_wait < 1 then
    return 1;
  end if;
  return ceil(v_wait)::int;
end $$;


-- Same as before, but with the better estimate.
create or replace function public.get_my_status(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_entry  queue_entries%rowtype;
  v_shop   shops%rowtype;
  v_ahead  int := 0;
  v_wait   int := 0;
begin
  select * into v_entry from queue_entries where customer_token = p_token;
  if not found then return null; end if;
  select * into v_shop from shops where id = v_entry.shop_id;

  if v_entry.status = 'waiting' then
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
    'status',         v_entry.status,
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


-- Helpers are only called from inside get_my_status, never by the app.
revoke execute on function public.shop_service_minutes(uuid)                     from public, anon, authenticated;
revoke execute on function public.estimate_wait_minutes(uuid, date, int, uuid) from public, anon, authenticated;

-- get_my_status keeps the permissions it had (customers are not logged in).
revoke execute on function public.get_my_status(uuid) from public;
grant  execute on function public.get_my_status(uuid) to anon, authenticated;
