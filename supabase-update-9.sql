-- =====================================================================
-- CRAM, backend UPDATE 9  (repair: the last missing permission)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Safe to run more than once. It deletes nothing.
-- I checked every table and function from the setup script and updates 2 to 8.
-- Updates 5, 6 and 7 already give their own permissions. The one thing still
-- missing is the school search box ("Type your school..."), which needs these:
-- =====================================================================
grant usage on schema extensions to anon, authenticated;                              -- the fuzzy-match helper it uses
grant execute on function public.search_institutions(text) to anon, authenticated;    -- the school search itself

notify pgrst, $$reload schema$$;
