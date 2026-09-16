## Lab Lighthouse numbers for production on demand (branch `cursor/lighthouse-production-lab-0901`) — 2026-09-16

**Trigger**: the GTM / performance audit cannot score the live site because
nothing has been measured. Vercel Web Analytics and Speed Insights were still
disabled as of 2026-09-16 (the analytics API returned "Web Analytics not
found"), and field INP needs days of real traffic after those tabs are
enabled. This lane reports lab numbers today without changing application
code.

`[ADDED]` **`.github/workflows/lighthouse-production.yml`** — `workflow_dispatch`
plus weekly `23 6 * * 1` (Monday 06:23 UTC, off-peak non-zero minute).
`treosh/lighthouse-ci-action@v12` runs Lighthouse's mobile preset against
`https://galaxiamea.com/` `/chart` `/chart/compare` `/why-galaxia` `/pricing`,
three runs per URL, no score assertions / no budget. The job summary prints
median performance score, LCP, CLS, TBT, FCP, and Speed Index, and marks LCP
over 2.5s and CLS over 0.1. HTML reports upload as the
`lighthouse-production-html` artifact. The job fails only if Lighthouse cannot
collect; slow numbers stay a green run. Follows existing workflow conventions
(`actions/checkout@v4`, `permissions.contents: read`, concurrency with
`cancel-in-progress: true`). `actions: write` is the extra permission the
artifact upload needs once a job-level `permissions:` block is present.

`[ADDED]` **`docs/performance.md`** — how to click **Run workflow**, where to
read field Web Vitals in the Vercel Speed Insights tab on the `galaxia`
project, the Core Web Vitals "good" thresholds at the 75th percentile (LCP
2.5s or less, INP 200ms or less, CLS 0.1 or less), and that INP exists only
in field data.

No application code, `package.json`, lockfile, `ENGINEERING.md`, or
`vercel.json` changes. This PR does not fix performance problems.
