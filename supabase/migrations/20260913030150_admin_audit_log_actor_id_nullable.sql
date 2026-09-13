-- Allow purge_own_account_data to null actor_id instead of deleting the
-- audit row, so the trail survives account deletion. target_user_id is
-- already nullable.

alter table public.admin_audit_log alter column actor_id drop not null;
