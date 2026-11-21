-- =====================================================================
-- CRAM, backend UPDATE 8  (repair: explicit table permissions)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Safe to run more than once. It deletes nothing and opens up NO extra data:
-- the row rules (RLS policies) from the earlier updates still decide which rows each person sees.
-- Why: older scripts relied on Supabase giving logged-in users basic table access automatically.
-- Newer Supabase projects don't always do that, which made "My profile" say it isn't switched on.
-- =====================================================================
grant usage on schema public to anon, authenticated;

-- Reading (each table's RLS policy still limits which rows)
grant select on public.profiles, public.student_profiles, public.tutor_profiles,
                public.tutor_institutions, public.tutor_subjects, public.subjects,
                public.institutions, public.institution_suggestions to authenticated;
grant select on public.institutions, public.subjects to anon;

-- Writing (only what the site does; RLS still checks it's your own row)
grant insert, delete on public.tutor_subjects to authenticated;
grant insert, update, delete on public.tutor_institutions to authenticated;
grant insert (name, city, type, website) on public.institution_suggestions to authenticated;

-- Make the website's database API notice the changes right away
notify pgrst, 'reload schema';
