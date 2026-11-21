-- =====================================================================
-- CRAM, backend UPDATE 10  (repair: "infinite recursion detected in policy")
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Safe to run more than once. It deletes nothing, and nobody can see or do more than before.
-- Why: four anti-spam limits counted rows in the SAME table they protect
-- ("max 30 subjects", "max 30 pending offers", "max 60 messages an hour", "max 5 school suggestions").
-- Postgres refuses a rule that reads its own table, so adding a subject, sending an offer,
-- sending a message or suggesting a school failed. The counting now happens in small helper
-- functions that only ever count YOUR OWN rows, and the rules call those instead.
-- =====================================================================

-- 1) Helpers: each counts only the caller's own rows ----------------------------
create or replace function public.my_subject_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.tutor_subjects where tutor_id = auth.uid();
$$;
create or replace function public.my_pending_offer_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.request_interests where tutor_id = auth.uid() and status = $s$pending$s$;
$$;
create or replace function public.my_messages_last_hour() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.messages where sender_id = auth.uid() and created_at > now() - interval $i$1 hour$i$;
$$;
create or replace function public.my_pending_suggestion_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.institution_suggestions where suggested_by = auth.uid() and status = $s$pending$s$;
$$;
revoke execute on function public.my_subject_count(), public.my_pending_offer_count(),
  public.my_messages_last_hour(), public.my_pending_suggestion_count() from public, anon;
grant execute on function public.my_subject_count(), public.my_pending_offer_count(),
  public.my_messages_last_hour(), public.my_pending_suggestion_count() to authenticated;

-- 2) Same rules as before, using the helpers ------------------------------------
-- Tutor subjects: your own, up to 30
drop policy if exists "tutor adds own subjects" on public.tutor_subjects;
create policy "tutor adds own subjects" on public.tutor_subjects for insert to authenticated
  with check (tutor_id = auth.uid() and public.my_subject_count() < 30);

-- Offers to help: approved and listed tutor, a request you can see, up to 30 pending
drop policy if exists "approved tutor offers help" on public.request_interests;
create policy "approved tutor offers help" on public.request_interests for insert to authenticated
  with check (tutor_id = auth.uid() and status = $s$pending$s$
    and exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id <> auth.uid())
    and exists (select 1 from public.tutor_profiles t where t.user_id = auth.uid() and t.approved and t.is_listed)
    and public.my_pending_offer_count() < 30);

-- Messages: only in your own conversations, up to 60 an hour
drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
    and exists (select 1 from public.conversations c where c.id = conversation_id and (c.student_id = auth.uid() or c.tutor_id = auth.uid()))
    and public.my_messages_last_hour() < 60);

-- School suggestions: your own, always pending, up to 5 waiting
drop policy if exists "users suggest schools" on public.institution_suggestions;
create policy "users suggest schools" on public.institution_suggestions for insert to authenticated
  with check (suggested_by = auth.uid() and status = $s$pending$s$ and public.my_pending_suggestion_count() < 5);

notify pgrst, $$reload schema$$;
