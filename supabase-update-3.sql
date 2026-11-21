-- =====================================================================
-- CRAM, backend UPDATE 3  (Phase 2: profiles)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after update 2. It keeps all your tables and data and deletes nothing. What it does:
--   1. Languages on every profile; level for students; levels taught and weekly availability for tutors.
--   2. A shared list of subjects and skills (EN/FR), and each tutor's subjects (with optional course code).
--   3. Schools can now be high schools too; school suggestions get a type and a spam limit.
--   4. A helper YOU run to approve a school suggestion in one line.
--   5. Users can no longer set their photo to any web address (photos come later through Supabase Storage).
-- =====================================================================

-- 1) New profile fields --------------------------------------------------
alter table public.profiles add column if not exists languages text[] not null default '{}'
  check (languages <@ array['en','fr','es','ar','zh','pt','it','other']);
alter table public.student_profiles add column if not exists level text
  check (level in ('high_school','cegep','university','adult'));
alter table public.tutor_profiles add column if not exists levels text[] not null default '{}'
  check (levels <@ array['high_school','cegep','university','adult']);
alter table public.tutor_profiles add column if not exists availability text[] not null default '{}'
  check (availability <@ array['weekday_morning','weekday_afternoon','weekday_evening','weekend_morning','weekend_afternoon','weekend_evening']);

-- Which columns people may change on their own rows
grant  update (languages)               on public.profiles         to authenticated;
revoke update (avatar_url)              on public.profiles         from authenticated;
grant  update (level)                   on public.student_profiles to authenticated;
grant  update (levels, availability)    on public.tutor_profiles   to authenticated;

-- 2) Subjects and skills -------------------------------------------------
create table if not exists public.subjects (
  id       bigint generated always as identity primary key,
  name_en  text not null unique check (char_length(name_en) between 2 and 80),
  name_fr  text not null check (char_length(name_fr) between 2 and 80),
  category text not null default 'academic' check (category in ('academic','language','tech','arts','other'))
);
alter table public.subjects enable row level security;
revoke insert, update, delete on public.subjects from anon, authenticated;   -- only you edit the list (Table Editor)
drop policy if exists "anyone reads subjects" on public.subjects;
create policy "anyone reads subjects" on public.subjects for select using (true);

insert into public.subjects (name_en, name_fr, category) values
  ('Math (general)','Mathématiques (général)','academic'), ('Calculus','Calcul différentiel et intégral','academic'),
  ('Linear algebra','Algèbre linéaire','academic'), ('Statistics','Statistiques','academic'),
  ('Physics','Physique','academic'), ('Chemistry','Chimie','academic'), ('Organic chemistry','Chimie organique','academic'),
  ('Biology','Biologie','academic'), ('Economics','Économie','academic'), ('Accounting','Comptabilité','academic'),
  ('Finance','Finance','academic'), ('Psychology','Psychologie','academic'), ('History','Histoire','academic'),
  ('Philosophy','Philosophie','academic'), ('English (school course)','Anglais (cours)','academic'),
  ('French (school course)','Français (cours)','academic'), ('Essay writing','Rédaction','academic'),
  ('Exam prep','Préparation aux examens','academic'),
  ('English as a second language','Anglais langue seconde','language'), ('French as a second language','Français langue seconde','language'),
  ('Spanish','Espagnol','language'), ('Arabic','Arabe','language'), ('Mandarin','Mandarin','language'),
  ('Programming (Python)','Programmation (Python)','tech'), ('Programming (Java)','Programmation (Java)','tech'),
  ('Web development','Développement Web','tech'), ('Excel','Excel','tech'), ('Data analysis','Analyse de données','tech'),
  ('Piano','Piano','arts'), ('Guitar','Guitare','arts'), ('Singing','Chant','arts'), ('Drawing','Dessin','arts')
on conflict (name_en) do nothing;

create table if not exists public.tutor_subjects (
  id             bigint generated always as identity primary key,
  tutor_id       uuid   not null references public.tutor_profiles(user_id) on delete cascade,
  subject_id     bigint not null references public.subjects(id),
  course_code    text   check (char_length(course_code) <= 30),     -- e.g. MATH 140 (optional)
  institution_id bigint references public.institutions(id),         -- where they took it (optional)
  grade          text   check (char_length(grade) <= 5),            -- self-reported, shown as such
  created_at     timestamptz not null default now()
);
create unique index if not exists tutor_subjects_unique on public.tutor_subjects (tutor_id, subject_id, coalesce(lower(course_code), ''));
alter table public.tutor_subjects enable row level security;
revoke all on public.tutor_subjects from anon;
drop policy if exists "see subjects of listed tutors or own" on public.tutor_subjects;
create policy "see subjects of listed tutors or own" on public.tutor_subjects for select to authenticated
  using (tutor_id = auth.uid() or exists (select 1 from public.tutor_profiles t where t.user_id = tutor_subjects.tutor_id and t.is_listed and t.approved));
drop policy if exists "tutor adds own subjects" on public.tutor_subjects;
create policy "tutor adds own subjects" on public.tutor_subjects for insert to authenticated
  with check (tutor_id = auth.uid() and (select count(*) from public.tutor_subjects s where s.tutor_id = auth.uid()) < 30);
drop policy if exists "tutor removes own subjects" on public.tutor_subjects;
create policy "tutor removes own subjects" on public.tutor_subjects for delete to authenticated using (tutor_id = auth.uid());

-- 3) Schools: high schools, and suggestion type + spam limit --------------
alter table public.institutions drop constraint if exists institutions_type_check;
alter table public.institutions add constraint institutions_type_check
  check (type in ('university','college','cegep','high_school','other'));
alter table public.institution_suggestions add column if not exists type text
  check (type in ('university','college','cegep','high_school','other'));
drop policy if exists "users suggest schools" on public.institution_suggestions;
create policy "users suggest schools" on public.institution_suggestions for insert to authenticated
  with check (suggested_by = auth.uid() and status = 'pending'
    and (select count(*) from public.institution_suggestions s where s.suggested_by = auth.uid() and s.status = 'pending') < 5);

-- 4) Approve a school suggestion (only YOU can run this, from the SQL Editor) ----
-- Usage:  select public.approve_institution_suggestion(12);   -- 12 = the suggestion's id
create or replace function public.approve_institution_suggestion(sid bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare s public.institution_suggestions; new_id bigint;
begin
  select * into s from public.institution_suggestions where id = sid and status = 'pending';
  if not found then raise exception 'No pending suggestion with id %', sid; end if;
  insert into public.institutions (name, type, city, website)
  values (s.name, coalesce(s.type, 'other'), s.city, s.website)
  on conflict do nothing returning id into new_id;
  update public.institution_suggestions set status = 'approved' where id = sid;
  return new_id;   -- empty if that school already existed
end $$;
revoke execute on function public.approve_institution_suggestion(bigint) from public, anon, authenticated;
