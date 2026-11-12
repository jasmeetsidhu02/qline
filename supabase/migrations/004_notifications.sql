-- =====================================================================
-- QLine — M6: notifications
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 001, 002 and 003)
--
-- A customer who closed the page still needs to hear when their turn is
-- near. That takes a "push subscription": a one-off address their browser
-- gives us, which we can post a message to even when nothing is open.
--
-- Two moments are worth interrupting someone for:
--   next — nobody is ahead of them any more
--   turn — the barber has called them to the chair
-- Each is sent at most once per visit, tracked by the notified_* columns.
-- =====================================================================


-- One row per device per visit. Tied to the queue entry, so it disappears
-- with the entry and we never keep a way to message someone afterwards.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.queue_entries(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  -- the language the customer was reading, so the message matches the page
  lang        text not null default 'pa' check (lang in ('pa', 'en')),
  created_at  timestamptz not null default now(),
  unique (entry_id, endpoint)
);

create index if not exists push_subscriptions_entry_idx on public.push_subscriptions (entry_id);

-- Nobody reads this table from the app. Only the sender (service role,
-- which bypasses RLS) touches it, and the customer writes through the
-- function below.
alter table public.push_subscriptions enable row level security;

alter table public.queue_entries add column if not exists notified_next_at timestamptz;
alter table public.queue_entries add column if not exists notified_turn_at timestamptz;


-- The customer's browser hands us its push address; we store it against
-- their ticket. Works only while they are actually in the line.
create or replace function public.save_push_subscription(
  p_token     uuid,
  p_endpoint  text,
  p_p256dh    text,
  p_auth      text,
  p_lang      text default 'pa'
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_entry queue_entries%rowtype;
begin
  select * into v_entry from queue_entries where customer_token = p_token;
  if not found then raise exception 'ENTRY_NOT_FOUND'; end if;
  if v_entry.status not in ('waiting', 'serving') then raise exception 'ENTRY_NOT_FOUND'; end if;
  if coalesce(btrim(p_endpoint), '') = '' then raise exception 'INVALID_SUBSCRIPTION'; end if;

  insert into push_subscriptions (entry_id, endpoint, p256dh, auth, lang)
  values (v_entry.id, p_endpoint, p_p256dh, p_auth,
          case when p_lang in ('pa', 'en') then p_lang else 'pa' end)
  on conflict (entry_id, endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
  return true;
end $$;


-- Everything that should be sent right now for this shop, in one step:
-- it marks the rows as notified and returns them, so two senders running
-- at the same time cannot send the same message twice.
--
-- Only the sender calls this (service role). It is never reachable from
-- the app, because it returns customers' push addresses.
create or replace function public.claim_due_notifications(p_shop_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shop   shops%rowtype;
  v_today  date;
  v_rows   jsonb;
begin
  select * into v_shop from shops where id = p_shop_id;
  if not found then raise exception 'SHOP_NOT_FOUND'; end if;
  v_today := shop_today(v_shop.timezone);

  with
  -- Called to the chair, not yet told.
  turn as (
    update queue_entries q
    set notified_turn_at = now()
    where q.shop_id = p_shop_id and q.queue_date = v_today
      and q.status = 'serving' and q.notified_turn_at is null
    returning q.id, q.ticket_no, q.customer_name, 'turn'::text as kind
  ),
  -- Nobody ahead of them any more, not yet told. Uses the same ordering
  -- as get_my_status so the customer's screen and the message agree.
  next_up as (
    update queue_entries q
    set notified_next_at = now()
    where q.id in (
      select w.id
      from queue_entries w
      where w.shop_id = p_shop_id and w.queue_date = v_today
        and w.status = 'waiting' and w.notified_next_at is null
        and not exists (
          select 1 from queue_entries a
          where a.shop_id = w.shop_id and a.queue_date = w.queue_date
            and a.status = 'waiting'
            and (a.joined_at, a.ticket_no) < (w.joined_at, w.ticket_no)
            and (w.preferred_barber_id is null
                 or a.preferred_barber_id is null
                 or a.preferred_barber_id = w.preferred_barber_id)
        )
    )
    returning q.id, q.ticket_no, q.customer_name, 'next'::text as kind
  ),
  due as (select * from turn union all select * from next_up)
  select coalesce(jsonb_agg(jsonb_build_object(
           'entry_id', d.id,
           'kind', d.kind,
           'ticket_no', d.ticket_no,
           'name', d.customer_name,
           'shop_name', v_shop.name,
           'shop_slug', v_shop.slug,
           'endpoint', s.endpoint,
           'p256dh', s.p256dh,
           'auth', s.auth,
           'lang', s.lang)), '[]'::jsonb)
    into v_rows
  from due d
  join push_subscriptions s on s.entry_id = d.id;

  return v_rows;
end $$;


-- A push address stops working once the browser throws it away. The sender
-- calls this when a push service reports the subscription is gone.
create or replace function public.drop_push_subscription(p_endpoint text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint;
  return found;
end $$;


-- Customers (not logged in) may only save their own subscription.
revoke execute on function public.save_push_subscription(uuid, text, text, text, text) from public;
grant  execute on function public.save_push_subscription(uuid, text, text, text, text) to anon, authenticated;

-- These two return or delete push addresses, so only the sender may call them.
revoke execute on function public.claim_due_notifications(uuid) from public, anon, authenticated;
revoke execute on function public.drop_push_subscription(text) from public, anon, authenticated;
