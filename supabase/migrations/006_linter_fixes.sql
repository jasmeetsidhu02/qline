-- =====================================================================
-- QLine — security linter follow-up
-- Run once in Supabase: SQL Editor → New query → paste → Run
-- (after 005)
--
-- Supabase's database linter flagged shop_today() for running without a
-- fixed search_path. Setting one stops the function resolving names
-- differently depending on who calls it.
-- =====================================================================

create or replace function public.shop_today(p_timezone text)
returns date language sql stable set search_path = public as $$
  select (now() at time zone p_timezone)::date;
$$;

-- NOT DONE ON PURPOSE: the same linter flags is_shop_member() for being
-- callable over the REST API. Do not revoke it. The row-security policies
-- on queue_entries, barbers, services and shops call it, and Postgres
-- evaluates those policies as the signed-in role, so that role must be
-- allowed to execute it. Revoking the grant makes every staff read fail
-- with "permission denied for function is_shop_member". The exposure is
-- harmless: the function only reports whether the caller is a member of a
-- shop they already named, and returns false for anyone not signed in.
