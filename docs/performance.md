# Production Web Vitals (lab and field)

The GTM / performance audit needs numbers, not guesses. This page is how to
produce **lab** numbers on demand and where to read **field** Web Vitals once
Vercel Speed Insights is collecting real traffic.

Nothing here is a score gate. Slow lab numbers are a report. Do not add
Lighthouse assertions, a performance budget, or a `vercel.json` cron to "fix"
the absence of data (ENGINEERING.md §2 / §14).

## Lab numbers (this repo)

Lab numbers come from GitHub Actions running Lighthouse's **mobile** preset
against production:

- https://galaxiamea.com/
- https://galaxiamea.com/chart
- https://galaxiamea.com/chart/compare
- https://galaxiamea.com/why-galaxia
- https://galaxiamea.com/pricing

Workflow: `.github/workflows/lighthouse-production.yml`.

Each URL is collected three times. The job summary reports the **median** of
those three runs for performance score, LCP, CLS, TBT, FCP, and Speed Index.
LCP over 2.5s and CLS over 0.1 are marked in the table. The HTML reports are
uploaded as the `lighthouse-production-html` workflow artifact.

The job fails only if Lighthouse cannot collect a report for every URL. A
slow LCP is still a green run.

### How to run the workflow

1. Open the repo on GitHub → **Actions**.
2. Select **Lighthouse production**.
3. **Run workflow** (uses `main` unless you pick another branch). Confirm.

It also runs on a weekly schedule (`23 6 * * 1`, Monday 06:23 UTC) so a fresh
lab snapshot exists without anyone clicking. GitHub's `schedule:` trigger can
delay or skip a run when the queue is busy; use **Run workflow** when you need
numbers today.

After the run finishes, open the job and read the summary table. Download the
HTML artifact if you need the full Lighthouse report (opportunities, treemap,
filmstrip).

INP is **not** in this table. Lighthouse lab runs do not measure INP.

## Field numbers (Vercel Speed Insights)

Field Web Vitals, including INP, live in the Vercel dashboard for the
`galaxia` project, not in this repo:

1. Open the Vercel dashboard → the **galaxia** project.
2. Open the **Speed Insights** tab.
   [Vercel Speed Insights docs](https://vercel.com/docs/speed-insights)

`apps/web/app/layout.tsx` already mounts `<Analytics />` and
`<SpeedInsights />`. Those components send events only when the app is served
from a Vercel deployment, and Vercel only stores them after Speed Insights
(and Web Analytics) are enabled on the project. Enabling those tabs is a
dashboard action; there is no `vercel.json` for it.

Field data needs real traffic. Expect a useful 75th-percentile sample after
days of production use, not immediately after enabling the tab.

INP exists only in field data. Do not look for it in the Lighthouse job
summary or the HTML artifact.

## Core Web Vitals "good" thresholds (75th percentile)

These are the Chrome / web.dev "good" thresholds, scored at the
**75th percentile** of real-user page views (field), not against a single
Lighthouse run:

| Metric | Good |
| --- | --- |
| LCP (Largest Contentful Paint) | 2.5s or less |
| INP (Interaction to Next Paint) | 200ms or less |
| CLS (Cumulative Layout Shift) | 0.1 or less |

Lab Lighthouse on this workflow is a different method (simulated mobile
device, simulated throttling, three runs, median). Use it to get a number
today. Use Speed Insights p75 to score the live product once traffic exists.
Do not treat a lab median and a field p75 as interchangeable.
