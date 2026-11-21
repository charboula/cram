-- =====================================================================
-- CRAM, backend UPDATE 4  (Phase 3: real tutor search)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after update 3. It deletes nothing. What it does:
--   Lets visitors who are NOT logged in browse tutor profiles, but ONLY tutors who
--   (a) chose "show my profile in search" and (b) YOU approved.
--   Students' information stays private: nothing about students is opened up.
-- =====================================================================

-- Reading permission for logged-out visitors on the four tutor tables (rows are still filtered by the rules below)
grant select on public.profiles, public.tutor_profiles, public.tutor_institutions, public.tutor_subjects to anon;

-- Same rules as before, now for logged-out visitors too
drop policy if exists "see listed tutors or own" on public.tutor_profiles;
create policy "see listed tutors or own" on public.tutor_profiles for select to anon, authenticated
  using ((is_listed and approved) or user_id = auth.uid());

drop policy if exists "see own or listed tutor profile" on public.profiles;
create policy "see own or listed tutor profile" on public.profiles for select to anon, authenticated
  using (id = auth.uid() or exists (select 1 from public.tutor_profiles t where t.user_id = profiles.id and t.is_listed and t.approved));

drop policy if exists "see schools of listed tutors or own" on public.tutor_institutions;
create policy "see schools of listed tutors or own" on public.tutor_institutions for select to anon, authenticated
  using (tutor_id = auth.uid() or exists (select 1 from public.tutor_profiles t where t.user_id = tutor_institutions.tutor_id and t.is_listed and t.approved));

drop policy if exists "see subjects of listed tutors or own" on public.tutor_subjects;
create policy "see subjects of listed tutors or own" on public.tutor_subjects for select to anon, authenticated
  using (tutor_id = auth.uid() or exists (select 1 from public.tutor_profiles t where t.user_id = tutor_subjects.tutor_id and t.is_listed and t.approved));

-- Visitors can only READ. Writing stays limited to logged-in owners (unchanged).
revoke insert, update, delete on public.profiles, public.tutor_profiles, public.tutor_institutions, public.tutor_subjects from anon;
