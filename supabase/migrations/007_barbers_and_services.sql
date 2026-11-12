-- =====================================================================
-- QLine — M7: barbers, services and the shop's own settings
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 006)
--
-- The barbers and services tables already existed and nothing used them.
-- This makes them usable:
--   * service names in Hindi as well as English and Punjabi
--   * "Next" can say which barber is free, so shops where customers pick a
--     barber call the right person
--   * the staff queue shows each customer's service and chosen barber
-- =====================================================================

alter table public.services add column if not exists name_hi text check (char_length(name_hi) <= 40);


-- Which barber is calling matters once customers can ask for one by name.
-- p_barber_id is optional: shops with a single shared line never pass it.
--
-- The old two-argument version has to go first. Leaving it in place would
-- make call_next(shop) and call_next(shop, entry) ambiguous, because the new
-- version can also be called with one or two arguments, and Postgres would
-- refuse every such call with "could not choose a best candidate function".
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


-- The dashboard needs to show what each customer asked for.
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
    -- The server's clock, so "waiting 12 min" is right even if the phone's is wrong.
    'server_now', now(),
    'serving', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'ticket_no', q.ticket_no, 'name', q.customer_name,
               'phone', q.phone, 'source', q.source,
               'joined_at', q.joined_at, 'called_at', q.called_at,
               'service', s.name_en, 'barber', b.name)
             order by q.called_at)
      from queue_entries q
      left join services s on s.id = q.service_id
      left join barbers  b on b.id = coalesce(q.served_by_barber_id, q.preferred_barber_id)
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'serving'), '[]'::jsonb),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'ticket_no', q.ticket_no, 'name', q.customer_name,
               'phone', q.phone, 'source', q.source,
               'joined_at', q.joined_at, 'called_at', q.called_at,
               'service', s.name_en, 'barber', b.name)
             order by q.joined_at, q.ticket_no)
      from queue_entries q
      left join services s on s.id = q.service_id
      left join barbers  b on b.id = q.preferred_barber_id
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'waiting'), '[]'::jsonb),
    'done_today', (
      select count(*) from queue_entries q
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'done'),
    'no_show_today', (
      select count(*) from queue_entries q
      where q.shop_id = p_shop_id and q.queue_date = v_today and q.status = 'no_show')
  );
end $$;


-- A chosen service tells us how long this customer will take, which is
-- better than the shop-wide average.
create or replace function public.estimate_wait_minutes(
  p_shop_id     uuid,
  p_queue_date  date,
  p_ahead       int,
  p_barber_id   uuid default null
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

  -- Minutes left for each customer currently in a chair. A customer who
  -- picked a service is measured against that service's own length.
  select coalesce(
           array_agg(greatest(0, coalesce(s.minutes, v_svc)
                                 - extract(epoch from (now() - q.called_at)) / 60)
                     order by q.called_at),
           '{}')
    into v_times
  from queue_entries q
  left join services s on s.id = q.service_id and s.is_active
  where q.shop_id = p_shop_id and q.queue_date = p_queue_date and q.status = 'serving'
    and (p_barber_id is null
         or coalesce(q.served_by_barber_id, q.preferred_barber_id) = p_barber_id);

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

  -- Every chair is busy, so it is never really "no wait".
  if v_free = 0 and v_wait < 1 then
    return 1;
  end if;
  return ceil(v_wait)::int;
end $$;


-- call_next changed shape, so the old two-argument grant has to be replaced.
revoke execute on function public.call_next(uuid, uuid, uuid) from public, anon;
grant  execute on function public.call_next(uuid, uuid, uuid) to authenticated;
revoke execute on function public.estimate_wait_minutes(uuid, date, int, uuid) from public, anon, authenticated;
