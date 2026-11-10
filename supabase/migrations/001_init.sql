-- =====================================================================
-- QLine — M1 initial schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run
--
-- Big ideas (see README "Database" section for the long version):
--   * Every row belongs to a shop (shop_id) → multi-tenant from day one.
--   * Row Level Security (RLS) decides who can read/write each row.
--   * Customers never log in and never touch tables directly. They call
--     a few "RPC" functions that check everything and return only safe data.
--   * Staff log in (Supabase Auth) and can read/write rows of THEIR shop.
-- =====================================================================


-- ---------- Enums: fixed lists of allowed values ----------------------
create type public.line_mode as enum ('shared', 'pick_barber');
create type public.entry_status as enum ('waiting', 'serving', 'done', 'no_show', 'left');


-- ---------- Tables -----------------------------------------------------

-- One row per salon. slug is the part of the QR URL: /s/<slug>
create table public.shops (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name                     text not null check (char_length(name) between 1 and 80),
  is_open                  boolean not null default false,
  line_mode                public.line_mode not null default 'shared',
  default_service_minutes  int not null default 20 check (default_service_minutes between 5 and 180),
  timezone                 text not null default 'Asia/Kolkata',
  created_at               timestamptz not null default now()
);

-- Which logged-in users work at which shop.
create table public.shop_members (
  shop_id     uuid not null references public.shops(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table public.barbers (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.services (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name_en     text not null check (char_length(name_en) between 1 and 40),
  name_pa     text check (char_length(name_pa) <= 40),
  minutes     int not null default 20 check (minutes between 5 and 180),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- The queue itself. One row per customer per visit.
create table public.queue_entries (
  id                   uuid primary key default gen_random_uuid(),
  shop_id              uuid not null references public.shops(id) on delete cascade,
  queue_date           date not null,              -- ticket numbers restart each day
  ticket_no            int  not null,
  customer_name        text not null check (char_length(customer_name) between 1 and 40),
  phone                text check (phone ~ '^[0-9]{10}$'),
  service_id           uuid references public.services(id) on delete set null,
  preferred_barber_id  uuid references public.barbers(id)  on delete set null,
  served_by_barber_id  uuid references public.barbers(id)  on delete set null,
  status               public.entry_status not null default 'waiting',
  source               text not null default 'qr' check (source in ('qr', 'walk_in')),
  customer_token       uuid not null default gen_random_uuid() unique, -- the customer's secret "key"
  joined_at            timestamptz not null default now(),
  called_at            timestamptz,
  finished_at          timestamptz,
  unique (shop_id, queue_date, ticket_no)
);

create index queue_entries_live_idx
  on public.queue_entries (shop_id, queue_date, status, joined_at);

-- A tiny public "something changed" counter per shop. Customers subscribe
-- to this with Realtime instead of to queue_entries (which holds phone
-- numbers they must never see). When it changes, they re-fetch their status.
create table public.queue_signals (
  shop_id     uuid primary key references public.shops(id) on delete cascade,
  version     bigint not null default 0,
  updated_at  timestamptz not null default now()
);


-- ---------- Triggers: keep queue_signals in sync automatically ---------

create or replace function public.bump_signal_from_entry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid := case when tg_op = 'DELETE' then old.shop_id else new.shop_id end;
begin
  insert into queue_signals (shop_id, version, updated_at)
  values (v_shop, 1, now())
  on conflict (shop_id) do update
    set version = queue_signals.version + 1, updated_at = now();
  return null;
end $$;

create trigger queue_entries_signal
  after insert or update or delete on public.queue_entries
  for each row execute function public.bump_signal_from_entry();

create or replace function public.bump_signal_from_shop()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into queue_signals (shop_id, version, updated_at)
  values (new.id, 1, now())
  on conflict (shop_id) do update
    set version = queue_signals.version + 1, updated_at = now();
  return null;
end $$;

-- Opening/closing the shop or changing settings also notifies customers.
create trigger shops_signal
  after insert or update on public.shops
  for each row execute function public.bump_signal_from_shop();


-- ---------- Helper functions --------------------------------------------

-- "Is the logged-in user a member of this shop?" Used by RLS policies.
-- security definer = runs with the table owner's rights, so it can read
-- shop_members even though RLS would otherwise hide other rows.
create or replace function public.is_shop_member(p_shop_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shop_members
    where shop_id = p_shop_id and user_id = auth.uid()
  );
$$;

-- Today's date in the shop's own timezone (so the queue resets at local midnight).
create or replace function public.shop_today(p_timezone text)
returns date language sql stable as $$
  select (now() at time zone p_timezone)::date;
$$;


-- ---------- Row Level Security ------------------------------------------
-- Once RLS is enabled, a table returns NOTHING unless a policy allows it.

alter table public.shops          enable row level security;
alter table public.shop_members   enable row level security;
alter table public.barbers        enable row level security;
alter table public.services       enable row level security;
alter table public.queue_entries  enable row level security;
alter table public.queue_signals  enable row level security;

-- shops: anyone can read basic shop info (name, open/closed). No secrets here.
create policy shops_read_all on public.shops
  for select using (true);
create policy shops_members_update on public.shops
  for update using (public.is_shop_member(id)) with check (public.is_shop_member(id));
-- No insert policy: shops are created only through create_shop() below.

-- shop_members: you can see your own memberships only.
create policy members_read_own on public.shop_members
  for select using (user_id = auth.uid());

-- barbers & services: public read (customers pick from them), members write.
create policy barbers_read_all on public.barbers
  for select using (true);
create policy barbers_members_write on public.barbers
  for all using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

create policy services_read_all on public.services
  for select using (true);
create policy services_members_write on public.services
  for all using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

-- queue_entries: ONLY staff of that shop. Customers go through the RPCs.
create policy entries_members_read on public.queue_entries
  for select using (public.is_shop_member(shop_id));
create policy entries_members_update on public.queue_entries
  for update using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
-- No insert/delete policy: new entries come from join_queue() (and add_walk_in() in M3).

-- queue_signals: public read (it's just a counter).
create policy signals_read_all on public.queue_signals
  for select using (true);


-- ---------- RPC functions (what the app calls) --------------------------
-- Errors are raised as short codes (SHOP_CLOSED, …) that the app translates
-- into Punjabi/English messages.

-- Customer joins the queue from the QR page.
create or replace function public.join_queue(
  p_slug        text,
  p_name        text,
  p_phone       text,
  p_service_id  uuid default null,
  p_barber_id   uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shop      shops%rowtype;
  v_today     date;
  v_name      text := btrim(coalesce(p_name, ''));
  v_phone     text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_existing  int;
  v_waiting   int;
  v_ticket    int;
  v_entry     queue_entries%rowtype;
begin
  select * into v_shop from shops where slug = lower(btrim(p_slug));
  if not found then raise exception 'SHOP_NOT_FOUND'; end if;
  if not v_shop.is_open then raise exception 'SHOP_CLOSED'; end if;

  if char_length(v_name) not between 1 and 40 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^[0-9]{10}$' then raise exception 'INVALID_PHONE'; end if;

  if p_service_id is not null and not exists (
    select 1 from services where id = p_service_id and shop_id = v_shop.id and is_active
  ) then raise exception 'INVALID_SERVICE'; end if;

  if p_barber_id is not null and not exists (
    select 1 from barbers where id = p_barber_id and shop_id = v_shop.id and is_active
  ) then raise exception 'INVALID_BARBER'; end if;

  v_today := shop_today(v_shop.timezone);

  -- Lock this shop's queue for the rest of the transaction so two people
  -- joining at the same second can't get the same ticket number.
  perform pg_advisory_xact_lock(hashtext(v_shop.id::text));

  -- Same phone already in today's line? Tell them their number instead of
  -- creating a duplicate. (We don't return the secret token here: anyone
  -- who knows a phone number could otherwise take over that ticket.)
  select q.ticket_no into v_existing
  from queue_entries q
  where q.shop_id = v_shop.id and q.queue_date = v_today
    and q.phone = v_phone and q.status in ('waiting', 'serving')
  limit 1;
  if found then raise exception 'ALREADY_IN_QUEUE:%', v_existing; end if;

  -- Simple spam guard: a small shop never has 100 people waiting.
  select count(*) into v_waiting
  from queue_entries q
  where q.shop_id = v_shop.id and q.queue_date = v_today and q.status = 'waiting';
  if v_waiting >= 100 then raise exception 'QUEUE_FULL'; end if;

  select coalesce(max(q.ticket_no), 0) + 1 into v_ticket
  from queue_entries q
  where q.shop_id = v_shop.id and q.queue_date = v_today;

  insert into queue_entries (shop_id, queue_date, ticket_no, customer_name, phone,
                             service_id, preferred_barber_id, source)
  values (v_shop.id, v_today, v_ticket, v_name, v_phone,
          p_service_id,
          case when v_shop.line_mode = 'pick_barber' then p_barber_id end,
          'qr')
  returning * into v_entry;

  return jsonb_build_object(
    'entry_id',       v_entry.id,
    'ticket_no',      v_entry.ticket_no,
    'customer_token', v_entry.customer_token
  );
end $$;


-- Customer checks their own ticket. Returns null if the token is unknown.
create or replace function public.get_my_status(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_entry    queue_entries%rowtype;
  v_shop     shops%rowtype;
  v_ahead    int := 0;
  v_barbers  int;
  v_minutes  int;
  v_wait     int := 0;
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

    -- Rough estimate for now; M5 replaces this with real recent service times.
    select greatest(count(*), 1) into v_barbers
    from barbers where shop_id = v_shop.id and is_active;
    if v_entry.preferred_barber_id is not null then v_barbers := 1; end if;

    v_minutes := v_shop.default_service_minutes;
    v_wait := ceil(v_ahead::numeric * v_minutes / v_barbers);
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


-- Customer leaves the line. Returns true if it worked.
create or replace function public.leave_queue(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update queue_entries
  set status = 'left', finished_at = now()
  where customer_token = p_token and status = 'waiting';
  return found;
end $$;


-- What the shop's TV screen shows. First names only, never phone numbers.
create or replace function public.get_public_queue(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_shop  shops%rowtype;
  v_today date;
begin
  select * into v_shop from shops where slug = lower(btrim(p_slug));
  if not found then return null; end if;
  v_today := shop_today(v_shop.timezone);

  return jsonb_build_object(
    'shop_id',   v_shop.id,
    'shop_name', v_shop.name,
    'is_open',   v_shop.is_open,
    'serving',   coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'ticket_no', q.ticket_no,
                            'name', split_part(q.customer_name, ' ', 1))
                          order by q.called_at)
                   from queue_entries q
                   where q.shop_id = v_shop.id and q.queue_date = v_today
                     and q.status = 'serving'), '[]'::jsonb),
    'waiting',   coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'ticket_no', q.ticket_no,
                            'name', split_part(q.customer_name, ' ', 1))
                          order by q.joined_at, q.ticket_no)
                   from queue_entries q
                   where q.shop_id = v_shop.id and q.queue_date = v_today
                     and q.status = 'waiting'), '[]'::jsonb)
  );
end $$;


-- A logged-in user creates their shop and becomes its owner.
create or replace function public.create_shop(p_name text, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_slug text := lower(btrim(p_slug));
  v_shop shops%rowtype;
begin
  if v_uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  if v_slug !~ '^[a-z0-9-]{3,40}$' then raise exception 'INVALID_SLUG'; end if;
  if exists (select 1 from shops where slug = v_slug) then raise exception 'SLUG_TAKEN'; end if;

  insert into shops (name, slug) values (btrim(p_name), v_slug) returning * into v_shop;
  insert into shop_members (shop_id, user_id, role) values (v_shop.id, v_uid, 'owner');

  return jsonb_build_object('shop_id', v_shop.id, 'slug', v_shop.slug);
end $$;


-- ---------- Who may call which function ---------------------------------
-- By default Postgres lets everyone execute functions. Lock that down.
revoke execute on function public.join_queue(text, text, text, uuid, uuid) from public;
revoke execute on function public.get_my_status(uuid)                      from public;
revoke execute on function public.leave_queue(uuid)                        from public;
revoke execute on function public.get_public_queue(text)                   from public;
revoke execute on function public.create_shop(text, text)                  from public;
revoke execute on function public.bump_signal_from_entry()                 from public;
revoke execute on function public.bump_signal_from_shop()                  from public;

-- Customers (not logged in = "anon") and staff ("authenticated"):
grant execute on function public.join_queue(text, text, text, uuid, uuid) to anon, authenticated;
grant execute on function public.get_my_status(uuid)                      to anon, authenticated;
grant execute on function public.leave_queue(uuid)                        to anon, authenticated;
grant execute on function public.get_public_queue(text)                   to anon, authenticated;
-- Only logged-in users can create a shop:
grant execute on function public.create_shop(text, text)                  to authenticated;
-- Supabase also grants anon/authenticated directly; make sure anon can't create shops:
revoke execute on function public.create_shop(text, text)                 from anon;
revoke execute on function public.bump_signal_from_entry()                from anon, authenticated;
revoke execute on function public.bump_signal_from_shop()                 from anon, authenticated;


-- ---------- Realtime ------------------------------------------------------
-- Customers listen to queue_signals; staff dashboards listen to queue_entries
-- (Realtime respects RLS, so staff only receive their own shop's rows).
alter publication supabase_realtime add table public.queue_signals;
alter publication supabase_realtime add table public.queue_entries;
