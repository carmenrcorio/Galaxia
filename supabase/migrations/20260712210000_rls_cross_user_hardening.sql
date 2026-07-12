-- Close cross-user data-access holes from the RLS audit (2026-07-12).
-- Sensitive tables hold birth data about real people including minors.
-- Do not weaken any existing owner check.

-- ─── FIX 2: thread_participants — no bare self-enrollment into foreign threads ───
-- Old INSERT WITH CHECK allowed (user_id = auth.uid()) alone, so any user could
-- join any thread and then read its messages via the participant SELECT policy.
-- Now: only the thread OWNER may INSERT participants. Participants (or the owner)
-- may UPDATE their own row for consent / leave, and DELETE to leave.

drop policy if exists "thread participants own row write" on thread_participants;

create policy "thread participants owner insert"
on thread_participants for insert
with check (
  exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = auth.uid()
  )
);

drop policy if exists "thread participants own row update" on thread_participants;
create policy "thread participants own row update"
on thread_participants for update
using (
  user_id = auth.uid()
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = auth.uid()
  )
);

drop policy if exists "thread participants own or owner delete" on thread_participants;
create policy "thread participants own or owner delete"
on thread_participants for delete
using (
  user_id = auth.uid()
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = auth.uid()
  )
);

-- ─── FIX 3: invites — person_id must belong to the inviter ───
drop policy if exists "invites owner manage" on invites;
create policy "invites owner manage"
on invites for all to authenticated
using (from_user = auth.uid())
with check (
  from_user = auth.uid()
  and (
    person_id is null
    or exists (
      select 1 from people
      where people.id = invites.person_id
        and people.owner_id = auth.uid()
    )
  )
);

-- ─── FIX 4: referenced people must be owned by the writer ───
drop policy if exists "group members via owner group write" on group_members;
create policy "group members via owner group write"
on group_members for insert
with check (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
  and exists (
    select 1 from people
    where people.id = group_members.person_id
      and people.owner_id = auth.uid()
  )
);

drop policy if exists "relationships owner all" on relationships;
create policy "relationships owner all"
on relationships for all
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from people
    where people.id = relationships.person_a
      and people.owner_id = auth.uid()
  )
  and exists (
    select 1 from people
    where people.id = relationships.person_b
      and people.owner_id = auth.uid()
  )
);

drop policy if exists "synastry owner all" on synastry;
create policy "synastry owner all"
on synastry for all
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from people
    where people.id = synastry.person_low
      and people.owner_id = auth.uid()
  )
  and exists (
    select 1 from people
    where people.id = synastry.person_high
      and people.owner_id = auth.uid()
  )
);

-- ─── ALSO: revoke EXECUTE on SECURITY DEFINER helpers from API roles ───
-- Triggers still fire (owned by postgres); anon/authenticated must not RPC them.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
