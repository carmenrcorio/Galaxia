create policy "profiles owner read"
on profiles for select
using (id = auth.uid());

create policy "profiles owner upsert"
on profiles for insert
with check (id = auth.uid());

create policy "profiles owner update"
on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "people owner all"
on people for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "charts via owned person read"
on charts for select
using (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = auth.uid()
  )
);

create policy "charts via owned person write"
on charts for insert
with check (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = auth.uid()
  )
);

create policy "charts via owned person update"
on charts for update
using (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from people
    where people.id = charts.person_id
      and people.owner_id = auth.uid()
  )
);

create policy "relationships owner all"
on relationships for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "groups owner all"
on groups for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "group members via owner group read"
on group_members for select
using (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);

create policy "group members via owner group write"
on group_members for insert
with check (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);

create policy "group members via owner group delete"
on group_members for delete
using (
  exists (
    select 1 from groups
    where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
  )
);

create policy "synastry owner all"
on synastry for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "notes owner all"
on notes for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "threads owner all"
on threads for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "thread participants own row read"
on thread_participants for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = auth.uid()
  )
);

create policy "thread participants own row write"
on thread_participants for insert
with check (
  user_id = auth.uid()
  or exists (
    select 1 from threads
    where threads.id = thread_participants.thread_id
      and threads.owner_id = auth.uid()
  )
);

create policy "messages via participant read"
on messages for select
using (
  exists (
    select 1 from thread_participants
    where thread_participants.thread_id = messages.thread_id
      and thread_participants.user_id = auth.uid()
      and thread_participants.consented_at is not null
      and thread_participants.left_at is null
  )
  or exists (
    select 1 from threads
    where threads.id = messages.thread_id
      and threads.owner_id = auth.uid()
  )
);

create policy "messages via participant write"
on messages for insert
with check (
  exists (
    select 1 from thread_participants
    where thread_participants.thread_id = messages.thread_id
      and thread_participants.user_id = auth.uid()
      and thread_participants.consented_at is not null
      and thread_participants.left_at is null
  )
  or exists (
    select 1 from threads
    where threads.id = messages.thread_id
      and threads.owner_id = auth.uid()
  )
);

create policy "transits via owned person read"
on transits for select
using (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = auth.uid()
  )
);

create policy "transits via owned person write"
on transits for insert
with check (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = auth.uid()
  )
);

create policy "transits via owned person update"
on transits for update
using (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from people
    where people.id = transits.person_id
      and people.owner_id = auth.uid()
  )
);
