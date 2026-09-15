-- Gift share: expiry and revoke on tokenized /s/<token> snapshots.
-- ENGINEERING.md §2: new file. Does not edit 20260722140000 or 20260723200000.
-- Timestamp is 20260914280000 so this runs after 20260914270000.
-- Safe to apply via `supabase db push`. Does not need autocommit.
--
-- Access stays service-role only (no anon/authenticated SELECT). Expired or
-- revoked tokens 404 the same as unknown tokens, so a directory or a guessed
-- token cannot distinguish them.

alter table quick_share_snapshots
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;

comment on column quick_share_snapshots.expires_at is
  'When this share link stops resolving. NULL means no expiry (legacy rows, and the signed-in no-expiry choice). Expired tokens 404 the same as unknown tokens.';

comment on column quick_share_snapshots.revoked_at is
  'Set when the creator revokes the link. NULL while live. Revoked tokens 404 the same as unknown tokens.';

create index if not exists quick_share_snapshots_created_by_live_idx
  on quick_share_snapshots (created_by, created_at desc)
  where created_by is not null and revoked_at is null;
