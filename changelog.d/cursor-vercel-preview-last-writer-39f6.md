## Vercel preview last-writer-wins (branch `cursor/voice-layers-outer-inner-39f6`) — 2026-09-14

**Trigger**: PR #236 showed Vercel as failed. Same commit `304fd18` had a Ready preview (`dpl_3XUzBBVU`, 02:58:08) then an Error (`dpl_8TcEMorW`, 02:58:22, empty `previewUrl`) after a second deploy started while the first was still running and overlapped PR #237.

`[DECISION]` This is a duplicate GitHub webhook (push + PR open ~14s apart) plus last-writer-wins commit status, not a Next.js build break. Local `pnpm --filter @galaxia/web build` already passed. Do not add `vercel.json`. Recorded in `ENGINEERING.md` §2. Fix is a follow-up push after the PR exists so one preview runs.
