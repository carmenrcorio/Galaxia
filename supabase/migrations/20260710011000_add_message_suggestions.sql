-- Vela replies end with up to 3 suggested follow-up prompts ("→ " lines).
-- They are presentation, not answer content: store them separately from the
-- message body so resumed threads render the body and the chips correctly.
alter table messages
add column if not exists suggestions jsonb;
