## Schedule the relational-transit cron routes via GitHub Actions (branch `cursor/schedule-relational-transit-cron-bb66`) — 2026-09-10

**Trigger**: `relational-transit-scan` and `relational-transit-push` (Generations Feature 3) shipped with `CRON_SECRET`-gated route handlers but no schedule — the obvious fix, a Vercel Cron Jobs entry, needs a committed `vercel.json`, which ENGINEERING.md §2 forbids. That missing context is why the feature shipped unscheduled.

`[ADDED]` **`.github/workflows/relational-transits.yml`** — daily (`17 4 * * *` UTC, off-peak minute/hour) plus `workflow_dispatch`. Two jobs, `scan` then `push` (`needs: scan`), each `curl --fail-with-body`-POSTs its route with the `CRON_SECRET` bearer header and echoes the HTTP status + JSON response body (never the secret) so a red Actions run is diagnosable. Fails loudly with `::error::` if the `GALAXIA_APP_URL` or `CRON_SECRET` repo secret is missing, rather than a silent no-op. Uses `--fail-with-body` (not plain `--fail`) specifically so the response body still reaches the log on a non-2xx status.

`[DECISION]` GitHub Actions `schedule:` is the scheduler for these two routes going forward, not a Vercel dashboard cron — same rationale as `deploy-edge-functions.yml`/`edge-functions-parity.yml` already living outside `vercel.json`. `ENGINEERING.md` §14 records this so the next `api/cron/*` route (`nudge-compute`, `nudge-send`, `trial-emails` all have the same unscheduled gap today) is wired up the same way instead of reaching for `vercel.json`.

`[ADDED]` `ENGINEERING.md` §14 — documents why these routes needed an out-of-band scheduler and points at this workflow as the template for the remaining unscheduled cron routes.

No changes to `@galaxia/astro` scan/push logic, interpretation templates, or any UI — both route handlers already returned real per-run counts (`ownersScanned`/`eventsUpserted`/`skipped` for scan, `evaluated`/`pushed`/`skipped` for push), so the Actions log surfaces real data, not a bare 200.

**Still needed (human, not code):** two repo secrets — `GALAXIA_APP_URL` (the deployed `apps/web` origin) and `CRON_SECRET` (must equal the value already configured on the Vercel project's env vars) — must be added by hand under repo Settings > Secrets and variables > Actions before this workflow can succeed. Until then, scheduled runs will fail closed on the "secret is not set" guard step.
