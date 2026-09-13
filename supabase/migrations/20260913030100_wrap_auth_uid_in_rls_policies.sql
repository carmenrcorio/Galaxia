-- Rewrite 31 owner-scoped RLS policies so every auth.uid() call is
-- (select auth.uid()). Postgres then evaluates it once per query instead
-- of once per row. Policy names, roles, commands, and predicates are
-- otherwise unchanged. Definitions were read from production pg_policies
-- (project eigfvribtntbxyjutsma) before rewriting.

-- charts
drop policy if exists "charts via owned person read" on public.charts;
create policy "charts via owned person read"
on public.charts for select
using (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = (select auth.uid())
  )
);

drop policy if exists "charts via owned person update" on public.charts;
create policy "charts via owned person update"
on public.charts for update
using (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = (select auth.uid())
  )
);

drop policy if exists "charts via owned person write" on public.charts;
create policy "charts via owned person write"
on public.charts for insert
with check (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = (select auth.uid())
  )
);

-- group_members
drop policy if exists "group members via owner group delete" on public.group_members;
create policy "group members via owner group delete"
on public.group_members for delete
using (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = (select auth.uid())
  )
);

drop policy if exists "group members via owner group read" on public.group_members;
create policy "group members via owner group read"
on public.group_members for select
using (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = (select auth.uid())
  )
);

drop policy if exists "group members via owner group write" on public.group_members;
create policy "group members via owner group write"
on public.group_members for insert
with check (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from people
    where people.id = group_members.person_id
      and people.owner_id = (select auth.uid())
  )
);

-- groups
drop policy if exists "groups owner all" on public.groups;
create policy "groups owner all"
on public.groups for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- invites (TO authenticated, last definition in 20260712210000)
drop policy if exists "invites owner manage" on public.invites;
create policy "invites owner manage"
on public.invites for all to authenticated
using (from_user = (select auth.uid()))
with check (
  from_user = (select auth.uid())
  and (
    person_id is null
    or exists (
      select 1 from people
      where people.id = invites.person_id
        and people.owner_id = (select auth.uid())
    )
  )
);

-- memorial_milestones
drop policy if exists "memorial_milestones owner all" on public.memorial_milestones;
create policy "memorial_milestones owner all"
on public.memorial_milestones for all
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from people p
    where p.id = memorial_milestones.profile_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from people p
    where p.id = memorial_milestones.profile_id
      and p.owner_id = (select auth.uid())
  )
);

-- messages
drop policy if exists "messages via participant read" on public.messages;
create policy "messages via participant read"
on public.messages for select
using (
  exists (
    select 1 from thread_participants
    where thread_participants.thread_id = messages.thread_id
      and thread_participants.user_id = (select auth.uid())
      and thread_participants.consented_at is not null
      and thread_participants.left_at is null
  )
  or exists (
    select 1 from threads
    where threads.id = messages.thread_id
      and threads.owner_id = (select auth.uid())
  )
);

drop policy if exists "messages via participant write" on public.messages;
create policy "messages via participant write"
on public.messages for insert
with check (
  exists (
    select 1 from thread_participants
    where thread_participants.thread_id = messages.thread_id
      and thread_participants.user_id = (select auth.uid())
      and thread_participants.consented_at is not null
      and thread_participants.left_at is null
  )
  or exists (
    select 1 from threads
    where threads.id = messages.thread_id
      and threads.owner_id = (select auth.uid())
  )
);

-- notes
drop policy if exists "notes owner all" on public.notes;
create policy "notes owner all"
on public.notes for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- people
drop policy if exists "people owner all" on public.people;
create policy "people owner all"
on public.people for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- person_daily_nudges
drop policy if exists "person_daily_nudges owner all" on public.person_daily_nudges;
create policy "person_daily_nudges owner all"
on public.person_daily_nudges for all
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from people p
    where p.id = person_daily_nudges.person_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from people p
    where p.id = person_daily_nudges.person_id
      and p.owner_id = (select auth.uid())
  )
);

-- profiles
drop policy if exists "profiles owner read" on public.profiles;
create policy "profiles owner read"
on public.profiles for select
using (id = (select auth.uid()));

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update"
on public.profiles for update
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "profiles owner upsert" on public.profiles;
create policy "profiles owner upsert"
on public.profiles for insert
with check (id = (select auth.uid()));

-- push_tokens
drop policy if exists "push_tokens owner all" on public.push_tokens;
create policy "push_tokens owner all"
on public.push_tokens for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- relational_transits
drop policy if exists "relational_transits owner all" on public.relational_transits;
create policy "relational_transits owner all"
on public.relational_transits for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- relationships
drop policy if exists "relationships owner all" on public.relationships;
create policy "relationships owner all"
on public.relationships for all
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from people
    where people.id = relationships.person_a
      and people.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from people
    where people.id = relationships.person_b
      and people.owner_id = (select auth.uid())
  )
);

-- support_requests (TO authenticated)
drop policy if exists "support_requests owner insert" on public.support_requests;
create policy "support_requests owner insert"
on public.support_requests for insert
to authenticated
with check (owner_id = (select auth.uid()));

-- synastry
drop policy if exists "synastry owner all" on public.synastry;
create policy "synastry owner all"
on public.synastry for all
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from people
    where people.id = synastry.person_low
      and people.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from people
    where people.id = synastry.person_high
      and people.owner_id = (select auth.uid())
  )
);

-- thread_participants
drop policy if exists "thread participants own or owner delete" on public.thread_participants;
create policy "thread participants own or owner delete"
on public.thread_participants for delete
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = (select auth.uid())
  )
);

drop policy if exists "thread participants own row read" on public.thread_participants;
create policy "thread participants own row read"
on public.thread_participants for select
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = (select auth.uid())
  )
);

drop policy if exists "thread participants own row update" on public.thread_participants;
create policy "thread participants own row update"
on public.thread_participants for update
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = (select auth.uid())
  )
);

drop policy if exists "thread participants owner insert" on public.thread_participants;
create policy "thread participants owner insert"
on public.thread_participants for insert
with check (
  exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = (select auth.uid())
  )
);

-- threads
drop policy if exists "threads owner all" on public.threads;
create policy "threads owner all"
on public.threads for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- transits
drop policy if exists "transits via owned person read" on public.transits;
create policy "transits via owned person read"
on public.transits for select
using (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = (select auth.uid())
  )
);

drop policy if exists "transits via owned person update" on public.transits;
create policy "transits via owned person update"
on public.transits for update
using (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = (select auth.uid())
  )
);

drop policy if exists "transits via owned person write" on public.transits;
create policy "transits via owned person write"
on public.transits for insert
with check (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = (select auth.uid())
  )
);

-- vela_rate_limits
drop policy if exists "vela_rate_limits owner read" on public.vela_rate_limits;
create policy "vela_rate_limits owner read"
on public.vela_rate_limits for select
using (user_id = (select auth.uid()));
