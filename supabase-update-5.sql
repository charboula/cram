-- =====================================================================
-- CRAM, backend UPDATE 5  (Phase 4: tutoring requests and Find Students)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after update 4. It deletes nothing. What it does:
--   1. Students post tutoring requests ("Calculus I, exam Dec 12, $30/hr, online").
--   2. A request is shown to tutors ONLY if the student turns on "let tutors find this", AND
--      the person posting is an adult or a parent account (requests from under-18s are never shown), AND
--      the tutor looking is APPROVED by you and 18 or older.
--   3. Tutors never see the student's name, email or private profile. The school appears only if the student added it to the request.
--   4. Tutors press "I'm interested" with a short note; only the student who posted sees it and decides.
--   5. Limits against spam: 5 open requests per student, 30 pending offers per tutor.
-- =====================================================================

-- 1) Requests ------------------------------------------------------------
create table if not exists public.tutor_requests (
  id             bigint generated always as identity primary key,
  student_id     uuid not null references public.student_profiles(user_id) on delete cascade,
  subject_id     bigint not null references public.subjects(id),
  course_code    text check (char_length(course_code) <= 30),
  institution_id bigint references public.institutions(id),          -- only stored if the student chose to show it
  level          text check (level in ('high_school','cegep','university','adult')),
  details        text not null check (char_length(details) between 10 and 600),
  budget_cents   int  check (budget_cents between 500 and 20000),
  format         text not null default 'either' check (format in ('online','in_person','either')),
  languages      text[] not null default '{}' check (languages <@ array['en','fr','es','ar','zh','pt','it','other']),
  availability   text[] not null default '{}' check (availability <@ array['weekday_morning','weekday_afternoon','weekday_evening','weekend_morning','weekend_afternoon','weekend_evening']),
  needed_by      date,
  discoverable   boolean not null default false,  -- the student's choice
  can_be_listed  boolean not null default false,  -- set by the database: true only for adults and parent accounts
  for_child      boolean not null default false,  -- set by the database: posted by a parent account
  status         text not null default 'open' check (status in ('open','closed')),
  created_at     timestamptz not null default now()
);

-- The database fills in who posted it and the safety flags (nobody can fake these)
create or replace function public.tutor_requests_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a public.account_details;
begin
  new.student_id := auth.uid();
  select * into a from public.account_details where user_id = auth.uid();
  new.for_child     := coalesce(a.account_kind = 'parent', false);
  new.can_be_listed := coalesce(a.account_kind = 'parent' or a.birth_date <= (current_date - interval '18 years')::date, false);
  new.status := 'open';
  if (select count(*) from public.tutor_requests r where r.student_id = auth.uid() and r.status = 'open') >= 5 then
    raise exception 'You can have up to 5 open requests';
  end if;
  return new;
end $$;
drop trigger if exists tutor_requests_before_insert on public.tutor_requests;
create trigger tutor_requests_before_insert before insert on public.tutor_requests
  for each row execute function public.tutor_requests_before_insert();

alter table public.tutor_requests enable row level security;
revoke all on public.tutor_requests from anon, authenticated;
grant select, delete on public.tutor_requests to authenticated;
grant insert (subject_id, course_code, institution_id, level, details, budget_cents, format, languages, availability, needed_by, discoverable) on public.tutor_requests to authenticated;
grant update (subject_id, course_code, institution_id, level, details, budget_cents, format, languages, availability, needed_by, discoverable, status) on public.tutor_requests to authenticated;

drop policy if exists "student or approved adult tutor sees request" on public.tutor_requests;
create policy "student or approved adult tutor sees request" on public.tutor_requests for select to authenticated
  using (student_id = auth.uid() or (
    status = 'open' and discoverable and can_be_listed
    and exists (select 1 from public.tutor_profiles t where t.user_id = auth.uid() and t.approved)
    and exists (select 1 from public.account_details a where a.user_id = auth.uid() and a.birth_date <= (current_date - interval '18 years')::date)));
drop policy if exists "student posts own request" on public.tutor_requests;
create policy "student posts own request" on public.tutor_requests for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "student edits own request" on public.tutor_requests;
create policy "student edits own request" on public.tutor_requests for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "student deletes own request" on public.tutor_requests;
create policy "student deletes own request" on public.tutor_requests for delete to authenticated using (student_id = auth.uid());

-- 2) "I'm interested" offers from tutors ---------------------------------
create table if not exists public.request_interests (
  id         bigint generated always as identity primary key,
  request_id bigint not null references public.tutor_requests(id) on delete cascade,
  tutor_id   uuid   not null default auth.uid() references public.tutor_profiles(user_id) on delete cascade,
  note       text   check (char_length(note) <= 500),
  status     text   not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (request_id, tutor_id)
);
alter table public.request_interests enable row level security;
revoke all on public.request_interests from anon, authenticated;
grant select, delete on public.request_interests to authenticated;
grant insert (request_id, note) on public.request_interests to authenticated;
grant update (status) on public.request_interests to authenticated;

drop policy if exists "tutor or request owner sees offer" on public.request_interests;
create policy "tutor or request owner sees offer" on public.request_interests for select to authenticated
  using (tutor_id = auth.uid() or exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id = auth.uid()));
drop policy if exists "approved tutor offers help" on public.request_interests;
create policy "approved tutor offers help" on public.request_interests for insert to authenticated
  with check (tutor_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id <> auth.uid())  -- a request this tutor may see
    and exists (select 1 from public.tutor_profiles t where t.user_id = auth.uid() and t.approved and t.is_listed)
    and (select count(*) from public.request_interests i where i.tutor_id = auth.uid() and i.status = 'pending') < 30);
drop policy if exists "request owner answers offer" on public.request_interests;
create policy "request owner answers offer" on public.request_interests for update to authenticated
  using (exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id = auth.uid()))
  with check (exists (select 1 from public.tutor_requests r where r.id = request_id and r.student_id = auth.uid()));
drop policy if exists "tutor withdraws own offer" on public.request_interests;
create policy "tutor withdraws own offer" on public.request_interests for delete to authenticated using (tutor_id = auth.uid());
