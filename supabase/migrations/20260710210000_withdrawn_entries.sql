-- Fabrication remediation (Phase 2), reversible, not destructive.
--
-- Phase 0 diagnosis found the three flagged fabrications live in `messages`
-- (ordinary Vela chat replies, surfaced on a person's Record as live
-- "conversation" previews), not in `notes`/`vela_pin`. Both tables get the
-- same nullable withdrawal columns: `messages` because that's where today's
-- real fabrications are, `notes` because `vela_pin` is a live path for the
-- same failure mode even though no pinned entry has hit it yet.
--
-- No data is deleted. A withdrawn row keeps its original body — the audit
-- trail matters, since one flagged entry sits on a minor's profile.
alter table messages
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_reason text;

alter table notes
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_reason text;
