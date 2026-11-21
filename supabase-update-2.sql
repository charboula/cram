-- =====================================================================
-- CRAM, backend UPDATE 2  (Phase 1 of the redesign)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after step 1 (and update 1, if you ran that). It keeps all your tables and data.
-- It deletes nothing. What it does:
--   1. One account can be BOTH a student and a tutor (adds the missing role on request).
--   2. A private "account_details" table: date of birth and whether it is a parent account.
--      Only the account owner can read their own row. Nobody can read anyone else's.
--   3. Safety rules for minors: no accounts under 14, tutors and parent accounts must be 18+.
--   4. Closes the old waitlist so strangers can no longer add rows (rows already there are kept).
-- =====================================================================

-- 1) Private account details -------------------------------------------
create table if not exists public.account_details (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  birth_date   date check (birth_date >= date '1900-01-01'),
  account_kind text not null default 'self' check (account_kind in ('self','parent')),  -- 'parent' = parent/guardian account
  created_at   timestamptz not null default now()
);
alter table public.account_details enable row level security;
revoke all on public.account_details from anon, authenticated;
grant select on public.account_details to authenticated;         -- read only; changes go through the functions below
drop policy if exists "see own details" on public.account_details;
create policy "see own details" on public.account_details for select to authenticated using (user_id = auth.uid());

-- Existing accounts get an empty row (they will be asked for their date of birth once, on their dashboard)
insert into public.account_details (user_id) select id from public.profiles on conflict do nothing;

-- 2) Sign-up helper, updated: saves date of birth and applies the age rules ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r  text  := case when m->>'role' = 'tutor' then 'tutor' else 'student' end;
  k  text  := case when m->>'account_kind' = 'parent' then 'parent' else 'self' end;
  bd date;
begin
  begin bd := (m->>'birth_date')::date; exception when others then bd := null; end;
  if bd is not null and (bd > current_date or bd < date '1900-01-01') then bd := null; end if;
  -- Under 14: no account (a parent or guardian creates one). The website explains this before it gets here.
  if bd is not null and bd > (current_date - interval '14 years')::date then
    raise exception 'Cram accounts are for people 14 and older';
  end if;
  -- Tutors and parent accounts must be adults; otherwise it becomes a normal student account
  if (r = 'tutor' or k = 'parent') and (bd is null or bd > (current_date - interval '18 years')::date) then
    r := 'student'; k := 'self';
  end if;
  insert into public.profiles (id, role, display_name) values (new.id, r, left(coalesce(m->>'display_name', ''), 80));
  insert into public.account_details (user_id, birth_date, account_kind) values (new.id, bd, k);
  if r = 'tutor' then insert into public.tutor_profiles (user_id) values (new.id);
  else insert into public.student_profiles (user_id) values (new.id);
  end if;
  return new;
end $$;

-- 3) Save date of birth once (for accounts made before this update) ----------
create or replace function public.set_birth_date(d date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if d is null or d > current_date or d < date '1900-01-01' then raise exception 'Please enter a real date of birth'; end if;
  if exists (select 1 from public.account_details where user_id = auth.uid() and birth_date is not null) then
    raise exception 'Your date of birth is already saved';
  end if;
  insert into public.account_details (user_id, birth_date) values (auth.uid(), d)
  on conflict (user_id) do update set birth_date = excluded.birth_date;
end $$;

-- 4) Add the other role to your own account ----------------------------
create or replace function public.add_role(r text) returns void
language plpgsql security definer set search_path = '' as $$
declare bd date;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if r = 'tutor' then
    select birth_date into bd from public.account_details where user_id = auth.uid();
    if bd is null or bd > (current_date - interval '18 years')::date then
      raise exception 'Tutors must be 18 or older';
    end if;
    insert into public.tutor_profiles (user_id) values (auth.uid()) on conflict do nothing;
  elsif r = 'student' then
    insert into public.student_profiles (user_id) values (auth.uid()) on conflict do nothing;
  else
    raise exception 'Unknown role';
  end if;
end $$;

-- Only logged-in people can call these two
revoke execute on function public.set_birth_date(date) from public, anon;
revoke execute on function public.add_role(text)       from public, anon;
grant  execute on function public.set_birth_date(date) to authenticated;
grant  execute on function public.add_role(text)       to authenticated;

-- 5) Close the old waitlist (the website no longer uses it; existing rows stay) ----------
drop policy if exists "anyone joins waitlist" on public.waitlist;
revoke insert on public.waitlist from anon, authenticated;
