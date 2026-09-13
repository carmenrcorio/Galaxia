## Recompute is_minor on birth_data invite accept (branch `cursor/invite-birth-data-is-minor-5262`) — 2026-09-13

**Trigger**: `POST /api/invite/birth-data` wrote `birth_date` onto the owner's people row but never recomputed `is_minor`. A person added with no date (`is_minor` defaulted false) could have a real under-18 date accepted in and stay marked as an adult.

`[FIXED]` **Accept path now calls `isMinorForSafety` on the submitted date and includes `is_minor` in the same people UPDATE as the other birth fields.** Same `@galaxia/core` helper `persist-person.ts` already uses (checkbox OR computed age < 18). Direction is raise-only: if the util returns true, write `is_minor = true`; if it returns false, omit the column so an existing true flag is not silently lowered. No column distinguishes "owner checked minor" from "computed," so an automatic downgrade is unsafe. Chart upsert and invite status update are unchanged.
