-- R5-E1: progressive capture. A person can exist with just name + relation,
-- before any birth data. Birth precision gains a 'none' state.
alter table people drop constraint if exists people_birth_precision_check;
alter table people alter column birth_precision set default 'none';
alter table people add constraint people_birth_precision_check
  check (birth_precision in ('none', 'exact', 'date', 'year'));

-- E3: an invite can request birth data for a specific pending person, so the
-- person themselves can fill it in via a public one-field page. Reuses the
-- existing invites table + /invite/[token] route.
alter table invites add column if not exists person_id uuid references people(id) on delete cascade;
alter table invites add column if not exists kind text not null default 'shared_space'
  check (kind in ('shared_space', 'birth_data'));

-- Let an authenticated owner create and read their own invites from the client.
-- (The public write-back path uses the service role in a server route.)
drop policy if exists "invites owner manage" on invites;
create policy "invites owner manage" on invites
  for all to authenticated
  using (from_user = auth.uid())
  with check (from_user = auth.uid());
