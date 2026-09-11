## Trial-emails cron tally (branch `cursor/fix-trial-emails-cron-tally-dae0`) — 2026-09-11

**Trigger**: GitHub Actions run 34551098951 called `POST /api/cron/trial-emails` and got HTTP 200 with `evaluated: 15`, `skipped.notDue: 1`, `sent: {}`. Fourteen trialing rows vanished from the summary.

`[FIXED]` **Trial-emails summary now counts every row.** The 14 missing rows were not dropped by the due-date filter — they passed `notDue` / `alreadySent` / `noEmail`, were due (`day14`×8, `day11`×4, `day1`×1, `day4_multi`×1), then `sendEmail` returned false (no Resend key or Resend error) and the loop fell through with no counter. That is a reporting bug, not a delivery-filter bug: `trial_emails` is still empty, so those users would still receive the email on a later successful send. The route now increments `skipped.noResendKey` or `skipped.sendFailed` on that path, `sent` is a number like the other cron routes, and every skip key is present at zero. Schedule unchanged — the founder decides when the first real send happens.

`[ADDED]` **Never send a trial email after `trial_ends_at`.** Before the kind picker, `trial_ends_at < now` increments `skipped.trialAlreadyEnded` and continues. This is a permanent backlog guard: only day1 / day4 / day11 can fire; day14 (today-or-past by definition) is unreachable once the trial is in the past. Against production's 15 trialing profiles this is 6 would-send (1 day1, 4 day11, 1 day4_multi) plus 8 `trialAlreadyEnded` plus 1 `notDue`, versus the previous 14 due. Schedule still unchanged.

`[ADDED]` **Cron tally invariant on all five cron routes.** `evaluated` must equal `sent` plus the sum of every skip count. A mismatch returns `ok: false`, a `mismatch` field (the accounted total), and HTTP 500 so `curl --fail-with-body` in the Actions workflows goes red. `nudge-send` counts `noResendKey` / `sendFailed` the same way; `relational-transit-push` counts `pushFailed` on a caught Expo fetch error (previously an uncounted `continue`).


