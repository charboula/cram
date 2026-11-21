-- =====================================================================
-- CRAM, backend step 1
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Safe to run once on a NEW project. It makes tables, security rules (RLS),
-- a sign-up helper, the institution search, the waitlist, and a small starter list.
-- After this, run the numbered update files in order (supabase-update-2.sql, then 3, ...).
-- Updated Nov 20, 2026: tutors need YOUR approval before they appear publicly,
-- the website waitlist saves here, and a few safety tweaks.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;   -- makes school-name search fast and typo-friendly

-- 1) One row per account (the login itself lives in Supabase's auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('student','tutor')),
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- 2) Schools: colleges, universities, cegeps...
create table public.institutions (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 2 and 160),
  name_fr    text,
  type       text not null default 'university' check (type in ('university','college','cegep','other')),
  city       text,
  province   text default 'QC',
  country    text default 'CA',
  website    text,
  created_at timestamptz not null default now()
);
create unique index institutions_unique on public.institutions (lower(name), coalesce(lower(city), ''));
create index institutions_name_search on public.institutions using gin (name extensions.gin_trgm_ops);

-- 3) "My school isn't listed" requests, reviewed by you in the dashboard
create table public.institution_suggestions (
  id           bigint generated always as identity primary key,
  suggested_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 160),
  city         text check (char_length(city) <= 100),
  website      text check (char_length(website) <= 200),
  note         text check (char_length(note) <= 500),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now()
);

-- 4) Student-only information
create table public.student_profiles (
  user_id                   uuid primary key references public.profiles(id) on delete cascade,
  institution_id            bigint references public.institutions(id),
  show_institution_publicly boolean not null default false     -- private unless the student opts in
);

-- 5) Tutor-only information
create table public.tutor_profiles (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  headline            text check (char_length(headline) <= 120),
  bio                 text check (char_length(bio) <= 1000),
  hourly_rate_cents   int  check (hourly_rate_cents between 500 and 20000),
  offers_online       boolean not null default true,
  offers_in_person    boolean not null default false,
  is_listed           boolean not null default false,            -- tutor chooses when to appear in search
  approved            boolean not null default false,            -- ONLY YOU set this (Table Editor). Tutors are hidden until approved.
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified'))
);

-- 6) Current and previous schools for each tutor
create table public.tutor_institutions (
  id             bigint generated always as identity primary key,
  tutor_id       uuid   not null references public.tutor_profiles(user_id) on delete cascade,
  institution_id bigint not null references public.institutions(id),
  is_current     boolean not null default false,
  program        text check (char_length(program) <= 120),
  start_year     int check (start_year between 1980 and 2100),
  end_year       int check (end_year between 1980 and 2100),
  unique (tutor_id, institution_id)
);

-- ---------------------------------------------------------------------
-- Sign-up helper: when someone registers, create their profile row.
-- Only 'student' or 'tutor' is accepted, so nobody can sign up as an admin.
-- ---------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r text := case when new.raw_user_meta_data->>'role' = 'tutor' then 'tutor' else 'student' end;
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, r, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80));
  if r = 'tutor' then insert into public.tutor_profiles (user_id) values (new.id);
  else insert into public.student_profiles (user_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Autocomplete: the website calls search_institutions('mcg') and gets up to 8 schools
-- ---------------------------------------------------------------------
create function public.search_institutions(q text) returns setof public.institutions
language sql stable set search_path = '' as $$
  select * from public.institutions
  where name ilike '%' || q || '%' or coalesce(name_fr, '') ilike '%' || q || '%'
  order by extensions.similarity(name, q) desc, name
  limit 8
$$;

-- ---------------------------------------------------------------------
-- SECURITY: Row Level Security (the database decides who sees/changes each row)
-- ---------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.institutions            enable row level security;
alter table public.institution_suggestions enable row level security;
alter table public.student_profiles        enable row level security;
alter table public.tutor_profiles          enable row level security;
alter table public.tutor_institutions      enable row level security;

-- Start from "nothing allowed", then grant only what each table needs.
revoke all on public.profiles, public.student_profiles, public.tutor_profiles,
              public.tutor_institutions, public.institution_suggestions from anon;
revoke insert, update, delete on public.institutions from anon, authenticated;   -- only you edit the school list
revoke insert, delete on public.profiles, public.student_profiles, public.tutor_profiles from authenticated;
revoke update on public.profiles, public.student_profiles, public.tutor_profiles from authenticated;
-- Users may change ONLY these columns (never their role or verification status):
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (institution_id, show_institution_publicly) on public.student_profiles to authenticated;
grant update (headline, bio, hourly_rate_cents, offers_online, offers_in_person, is_listed) on public.tutor_profiles to authenticated;

-- Institutions: everyone (even logged out) can read the list
create policy "anyone reads institutions" on public.institutions for select using (true);

-- Suggestions: logged-in users add their own (always 'pending') and see their own
create policy "users suggest schools" on public.institution_suggestions for insert to authenticated
  with check (suggested_by = auth.uid() and status = 'pending');
create policy "users see own suggestions" on public.institution_suggestions for select to authenticated
  using (suggested_by = auth.uid());

-- Tutor profiles: public only when the tutor chose to be listed AND you approved them; the owner always sees and edits their own
create policy "see listed tutors or own" on public.tutor_profiles for select to authenticated
  using ((is_listed and approved) or user_id = auth.uid());
create policy "tutor edits own" on public.tutor_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Profiles: you see your own, plus name/photo of listed tutors
create policy "see own or listed tutor profile" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (select 1 from public.tutor_profiles t where t.user_id = profiles.id and t.is_listed and t.approved));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Student profiles: strictly private to the student
create policy "student sees own" on public.student_profiles for select to authenticated using (user_id = auth.uid());
create policy "student edits own" on public.student_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tutor schools: owner manages; others see them only for listed tutors
create policy "see schools of listed tutors or own" on public.tutor_institutions for select to authenticated
  using (tutor_id = auth.uid() or exists (select 1 from public.tutor_profiles t where t.user_id = tutor_institutions.tutor_id and t.is_listed and t.approved));
create policy "tutor adds own schools" on public.tutor_institutions for insert to authenticated with check (tutor_id = auth.uid());
create policy "tutor edits own schools" on public.tutor_institutions for update to authenticated
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());
create policy "tutor removes own schools" on public.tutor_institutions for delete to authenticated using (tutor_id = auth.uid());

-- (Removed: the student_public_institution view. Nothing used it, and views skip the security rules above.)

-- ---------------------------------------------------------------------
-- Waitlist: the website's "Notify me" box saves emails here.
-- Visitors can ADD an email but can never read, change or delete the list. Only you see it (Table Editor).
-- ---------------------------------------------------------------------
create table public.waitlist (
  id         bigint generated always as identity primary key,
  email      text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lang       text check (lang in ('en','fr')),
  created_at timestamptz not null default now()
);
create unique index waitlist_email_unique on public.waitlist (lower(email));   -- same email twice = ignored
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
grant insert (email, lang) on public.waitlist to anon, authenticated;
create policy "anyone joins waitlist" on public.waitlist for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------
-- Starter list of Quebec schools. Check the names and add the rest later from official lists.
-- ---------------------------------------------------------------------
insert into public.institutions (name, name_fr, type, city) values
  ('McGill University',                 null,                                   'university', 'Montréal'),
  ('Concordia University',              'Université Concordia',                 'university', 'Montréal'),
  ('Université de Montréal',            'Université de Montréal',               'university', 'Montréal'),
  ('UQAM',                              'Université du Québec à Montréal',      'university', 'Montréal'),
  ('HEC Montréal',                      'HEC Montréal',                         'university', 'Montréal'),
  ('Polytechnique Montréal',            'Polytechnique Montréal',               'university', 'Montréal'),
  ('Université Laval',                  'Université Laval',                     'university', 'Québec'),
  ('Université de Sherbrooke',          'Université de Sherbrooke',             'university', 'Sherbrooke'),
  ('Vanier College',                    'Collège Vanier',                       'cegep',      'Montréal'),
  ('Dawson College',                    'Collège Dawson',                       'cegep',      'Montréal'),
  ('John Abbott College',               'Collège John Abbott',                  'cegep',      'Sainte-Anne-de-Bellevue'),
  ('Marianopolis College',              'Collège Marianopolis',                 'college',    'Montréal'),
  ('Cégep Montmorency',                 'Cégep Montmorency',                    'cegep',      'Laval'),
  ('Collège de Maisonneuve',            'Collège de Maisonneuve',               'cegep',      'Montréal')
on conflict do nothing;
