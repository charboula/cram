-- =====================================================================
-- CRAM, backend UPDATE 6  (Phase 5: messages)
-- Where to run it: Supabase dashboard > SQL Editor > New query > paste > Run
-- Run it ONCE, after update 5. It deletes nothing. What it does:
--   1. Private conversations between ONE student and ONE tutor. Only those two people can read them.
--   2. Only a STUDENT can start a conversation: by pressing "Contact" on an approved tutor's profile,
--      or by pressing "Connect" on a tutor's offer. Tutors can never message a student first.
--   3. In a conversation, each person sees the other's display name (nothing else is opened up).
--   4. Unread counts, and a limit of 60 messages per hour per person against spam.
-- =====================================================================

-- 1) Conversations --------------------------------------------------------
create table if not exists public.conversations (
  id               bigint generated always as identity primary key,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  tutor_id         uuid not null references public.profiles(id) on delete cascade,
  request_id       bigint references public.tutor_requests(id) on delete set null,  -- the request it came from, if any
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz,
  last_sender_id   uuid,
  student_last_read timestamptz,
  tutor_last_read   timestamptz,
  unique (student_id, tutor_id),
  check (student_id <> tutor_id)
);
alter table public.conversations enable row level security;
revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;      -- created and updated only by the functions below
drop policy if exists "participants see conversation" on public.conversations;
create policy "participants see conversation" on public.conversations for select to authenticated
  using (student_id = auth.uid() or tutor_id = auth.uid());

-- 2) Messages ---------------------------------------------------------------
create table if not exists public.messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id       uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  body            text   not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_by_conversation on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.student_id = auth.uid() or c.tutor_id = auth.uid())));
drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
    and exists (select 1 from public.conversations c where c.id = conversation_id and (c.student_id = auth.uid() or c.tutor_id = auth.uid()))
    and (select count(*) from public.messages m where m.sender_id = auth.uid() and m.created_at > now() - interval '1 hour') < 60);

-- Keep "last message" info on the conversation up to date
create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at, last_sender_id = new.sender_id where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- 3) See the other person's display name in your conversations -------------
drop policy if exists "see people you talk with" on public.profiles;
create policy "see people you talk with" on public.profiles for select to authenticated
  using (exists (select 1 from public.conversations c where (c.student_id = auth.uid() and c.tutor_id = profiles.id) or (c.tutor_id = auth.uid() and c.student_id = profiles.id)));

-- 4) Starting a conversation (students only) --------------------------------
-- From a tutor's profile: returns the conversation id (the existing one if you already talked)
create or replace function public.start_conversation(tutor uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare cid bigint;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if not exists (select 1 from public.student_profiles where user_id = auth.uid()) then raise exception 'Only students can contact tutors'; end if;
  if not exists (select 1 from public.tutor_profiles where user_id = tutor and approved and is_listed) then raise exception 'This tutor is not available'; end if;
  insert into public.conversations (student_id, tutor_id) values (auth.uid(), tutor)
  on conflict (student_id, tutor_id) do nothing;
  select id into cid from public.conversations where student_id = auth.uid() and tutor_id = tutor;
  return cid;
end $$;
revoke execute on function public.start_conversation(uuid) from public, anon;
grant  execute on function public.start_conversation(uuid) to authenticated;

-- From a tutor's offer: when the student presses Connect, open the conversation automatically
create or replace function public.request_interests_after_accept() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select student_id into sid from public.tutor_requests where id = new.request_id;
    insert into public.conversations (student_id, tutor_id, request_id) values (sid, new.tutor_id, new.request_id)
    on conflict (student_id, tutor_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists request_interests_after_accept on public.request_interests;
create trigger request_interests_after_accept after update on public.request_interests
  for each row execute function public.request_interests_after_accept();

-- 5) Mark a conversation as read ---------------------------------------------
create or replace function public.mark_conversation_read(cid bigint) returns void
language sql security definer set search_path = '' as $$
  update public.conversations set student_last_read = now() where id = cid and student_id = auth.uid();
  update public.conversations set tutor_last_read   = now() where id = cid and tutor_id   = auth.uid();
$$;
revoke execute on function public.mark_conversation_read(bigint) from public, anon;
grant  execute on function public.mark_conversation_read(bigint) to authenticated;
