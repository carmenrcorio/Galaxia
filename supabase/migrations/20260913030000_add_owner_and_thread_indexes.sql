-- Secondary indexes for owner-scoped lookups and the messages RLS
-- EXISTS subquery against thread_participants. Not CONCURRENTLY:
-- supabase db push wraps each migration in a transaction, and these
-- tables are small.

create index if not exists people_owner_id_idx on public.people (owner_id);
create index if not exists notes_owner_id_idx on public.notes (owner_id);
create index if not exists messages_thread_id_idx on public.messages (thread_id);
create index if not exists thread_participants_user_id_idx
  on public.thread_participants (user_id);
create index if not exists thread_participants_thread_id_idx
  on public.thread_participants (thread_id);
