-- =====================================================================
-- CRAM, backend UPDATE 7  (Phase 6: sessions and reviews)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after update 6. It deletes nothing. What it does:
--   1. Inside a conversation, the student or the tutor proposes a session (date, time, length, format, price).
--      The other person confirms or declines. Either person can cancel before it starts.
--   2. After the start time, the STUDENT marks it as done ("the session happened").
--   3. Only after a session is done can the student leave ONE review (1 to 5 stars + optional comment).
--      Reviews show on the tutor's public profile WITHOUT the student's name.
--   4. Nobody can edit sessions or reviews directly: every change goes through the functions below,
--      which check who you are and what is allowed.
-- =====================================================================

-- 1) Sessions ---------------------------------------------------------------
create table if not exists public.sessions (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  student_id      uuid   not null references public.profiles(id) on delete cascade,
  tutor_id        uuid   not null references public.profiles(id) on delete cascade,
  proposed_by     uuid   not null references public.profiles(id) on delete cascade,
  topic           text   check (char_length(topic) <= 120),
  starts_at       timestamptz not null,
  minutes         int    not null check (minutes between 30 and 240),
  format          text   not null check (format in ('online','in_person')),
  rate_cents      int    not null check (rate_cents between 500 and 20000),  -- price per hour agreed for this session
  status          text   not null default 'proposed' check (status in ('proposed','confirmed','declined','cancelled','completed')),
  created_at      timestamptz not null default now()
);
create index if not exists sessions_by_conversation on public.sessions (conversation_id, starts_at);
alter table public.sessions enable row level security;
revoke all on public.sessions from anon, authenticated;
grant select on public.sessions to authenticated;      -- changed only by the functions below
drop policy if exists "participants see sessions" on public.sessions;
create policy "participants see sessions" on public.sessions for select to authenticated
  using (student_id = auth.uid() or tutor_id = auth.uid());

-- Propose a session in one of your conversations
create or replace function public.propose_session(cid bigint, starts timestamptz, mins int, fmt text, rate int, what text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare c public.conversations; sid bigint;
begin
  select * into c from public.conversations where id = cid and (student_id = auth.uid() or tutor_id = auth.uid());
  if c.id is null then raise exception 'Conversation not found'; end if;
  if starts < now() + interval '1 hour' or starts > now() + interval '180 days' then
    raise exception 'Pick a time between 1 hour and 6 months from now';
  end if;
  if (select count(*) from public.sessions s where s.proposed_by = auth.uid() and s.status = 'proposed') >= 10 then
    raise exception 'You already have 10 proposals waiting for an answer';
  end if;
  insert into public.sessions (conversation_id, student_id, tutor_id, proposed_by, topic, starts_at, minutes, format, rate_cents)
  values (cid, c.student_id, c.tutor_id, auth.uid(), nullif(trim(what), ''), starts, mins, fmt, rate)
  returning id into sid;
  return sid;
end $$;
revoke execute on function public.propose_session(bigint, timestamptz, int, text, int, text) from public, anon;
grant  execute on function public.propose_session(bigint, timestamptz, int, text, int, text) to authenticated;

-- Answer or update a session: 'confirm', 'decline', 'cancel' or 'complete'
create or replace function public.update_session(sid bigint, action text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.sessions;
begin
  select * into s from public.sessions where id = sid and (student_id = auth.uid() or tutor_id = auth.uid());
  if s.id is null then raise exception 'Session not found'; end if;
  if action in ('confirm','decline') then
    if s.status <> 'proposed' or s.proposed_by = auth.uid() then raise exception 'Only the other person can answer this proposal'; end if;
    if action = 'confirm' and s.starts_at < now() then raise exception 'This time has already passed'; end if;
    update public.sessions set status = case when action = 'confirm' then 'confirmed' else 'declined' end where id = sid;
  elsif action = 'cancel' then
    if s.status not in ('proposed','confirmed') or s.starts_at < now() then raise exception 'This session can no longer be cancelled'; end if;
    update public.sessions set status = 'cancelled' where id = sid;
  elsif action = 'complete' then
    if s.student_id <> auth.uid() then raise exception 'Only the student marks a session as done'; end if;
    if s.status <> 'confirmed' or s.starts_at > now() then raise exception 'A session can be marked as done only after it starts'; end if;
    update public.sessions set status = 'completed' where id = sid;
  else
    raise exception 'Unknown action';
  end if;
end $$;
revoke execute on function public.update_session(bigint, text) from public, anon;
grant  execute on function public.update_session(bigint, text) to authenticated;

-- 2) Reviews ------------------------------------------------------------------
create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  session_id  bigint not null unique references public.sessions(id) on delete cascade,
  tutor_id    uuid   not null references public.profiles(id) on delete cascade,
  student_id  uuid   not null references public.profiles(id) on delete cascade,
  rating      int    not null check (rating between 1 and 5),
  comment     text   check (char_length(comment) <= 600),
  created_at  timestamptz not null default now()
);
create index if not exists reviews_by_tutor on public.reviews (tutor_id, created_at);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
-- Everyone can read the rating, comment and date of reviews for tutors shown in search; never who wrote it
grant select (id, session_id, tutor_id, rating, comment, created_at) on public.reviews to anon, authenticated;
grant delete on public.reviews to authenticated;
drop policy if exists "reviews of listed tutors are public" on public.reviews;
create policy "reviews of listed tutors are public" on public.reviews for select to anon, authenticated
  using (exists (select 1 from public.tutor_profiles t where t.user_id = reviews.tutor_id and t.approved and t.is_listed)
         or tutor_id = auth.uid() or student_id = auth.uid());
drop policy if exists "student deletes own review" on public.reviews;
create policy "student deletes own review" on public.reviews for delete to authenticated using (student_id = auth.uid());

-- Leave a review: only the student, only after the session is marked as done, only once
create or replace function public.add_review(sid bigint, stars int, words text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.sessions;
begin
  select * into s from public.sessions where id = sid and student_id = auth.uid();
  if s.id is null or s.status <> 'completed' then raise exception 'You can review a tutor only after a session you took is marked as done'; end if;
  insert into public.reviews (session_id, tutor_id, student_id, rating, comment)
  values (sid, s.tutor_id, s.student_id, stars, nullif(trim(words), ''));
exception when unique_violation then
  raise exception 'You already reviewed this session';
end $$;
revoke execute on function public.add_review(bigint, int, text) from public, anon;
grant  execute on function public.add_review(bigint, int, text) to authenticated;

-- Average rating and number of reviews per tutor (for search results)
create or replace function public.tutor_ratings()
returns table (tutor_id uuid, avg_rating numeric, review_count int)
language sql stable security definer set search_path = '' as $$
  select r.tutor_id, round(avg(r.rating), 1), count(*)::int
  from public.reviews r join public.tutor_profiles t on t.user_id = r.tutor_id and t.approved and t.is_listed
  group by r.tutor_id;
$$;
revoke execute on function public.tutor_ratings() from public;
grant  execute on function public.tutor_ratings() to anon, authenticated;
