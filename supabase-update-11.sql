-- =====================================================================
-- CRAM, backend UPDATE 11  (launch basics: delete my account + report a problem)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after updates 8, 9 and 10. It deletes nothing by itself. What it does:
--   1. "Delete my account": a function that removes ONLY the account of the person calling it,
--      together with everything linked to it (profile, requests, offers, conversations, messages,
--      sessions, reviews). Nobody can delete someone else's account with it.
--   2. "Report": a private reports table. Logged-in users can send a report (up to 20 a day);
--      NOBODY can read reports through the website. Only you can, in the Supabase dashboard
--      (see the query at the bottom).
-- (Password reset needs no database change: Supabase handles it.)
-- =====================================================================

-- 1) Delete my account -------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception $m$Please log in first$m$; end if;
  -- Every Cram table is linked to the account with "on delete cascade", so this removes all of it.
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

-- 2) Reports -------------------------------------------------------------------
create table if not exists public.reports (
  id              bigint generated always as identity primary key,
  reporter_id     uuid default auth.uid() references public.profiles(id) on delete set null,
  target_user     uuid references public.profiles(id) on delete set null,       -- the person reported
  conversation_id bigint references public.conversations(id) on delete set null, -- if reported from a conversation
  reason          text not null check (reason in ($r$inappropriate$r$, $r$harassment$r$, $r$scam$r$, $r$fake$r$, $r$minor_safety$r$, $r$other$r$)),
  details         text check (char_length(details) <= 1000),
  status          text not null default $s$open$s$ check (status in ($s$open$s$, $s$reviewed$s$)),
  created_at      timestamptz not null default now()
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant insert (target_user, conversation_id, reason, details) on public.reports to authenticated;   -- send only; no reading

-- Counts only your own reports from the last 24 hours (a helper, so the rule never reads its own table)
create or replace function public.my_reports_today() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.reports where reporter_id = auth.uid() and created_at > now() - interval $i$1 day$i$;
$$;
revoke execute on function public.my_reports_today() from public, anon;
grant  execute on function public.my_reports_today() to authenticated;

drop policy if exists "users send reports" on public.reports;
create policy "users send reports" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = $s$open$s$ and (target_user is null or target_user <> auth.uid())
    and public.my_reports_today() < 20);

notify pgrst, $$reload schema$$;

-- ---------------------------------------------------------------------------
-- FOR YOU (admin): read the newest reports. Copy just these lines into a new query when you want to check.
--   select r.id, r.created_at, r.reason, r.details, r.status,
--          rep.display_name as reported_by, tgt.display_name as reported_person, r.conversation_id
--   from public.reports r
--   left join public.profiles rep on rep.id = r.reporter_id
--   left join public.profiles tgt on tgt.id = r.target_user
--   order by r.created_at desc limit 50;
-- To read a reported conversation:  select sender_id, body, created_at from public.messages where conversation_id = 123 order by id;
-- To mark a report as handled:      update public.reports set status = 'reviewed' where id = 123;
-- To hide a tutor from search:      update public.tutor_profiles set approved = false where user_id = 'their-id';
-- ---------------------------------------------------------------------------
