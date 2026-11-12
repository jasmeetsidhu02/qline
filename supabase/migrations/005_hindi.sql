-- =====================================================================
-- QLine — Hindi
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 004)
--
-- Notifications are written in whichever language the customer was reading,
-- so the stored language now has to allow Hindi too.
-- =====================================================================

alter table public.push_subscriptions drop constraint if exists push_subscriptions_lang_check;
alter table public.push_subscriptions add constraint push_subscriptions_lang_check
  check (lang in ('en', 'hi', 'pa'));

-- Same function as before; only the list of accepted languages changes.
create or replace function public.save_push_subscription(
  p_token     uuid,
  p_endpoint  text,
  p_p256dh    text,
  p_auth      text,
  p_lang      text default 'en'
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
          case when p_lang in ('en', 'hi', 'pa') then p_lang else 'en' end)
  on conflict (entry_id, endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
  return true;
end $$;

revoke execute on function public.save_push_subscription(uuid, text, text, text, text) from public;
grant  execute on function public.save_push_subscription(uuid, text, text, text, text) to anon, authenticated;
