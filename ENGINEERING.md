# Galaxia — Engineering Standards

Every rule here exists because we broke it and lost time. Read this before writing code or instructing an AI agent.

---

## 1. Design source of truth lives in the repo

**Rule:** If a design is authoritative, it is committed. No exceptions.

The premium landing page and the app prototype existed for weeks only as files outside the repo. Cursor could not see them, so it invented generic replacements twice: once for the marketing homepage, once for every signed-in screen. Weeks of rework.

- `design/reference/galaxia.jsx` — the app's structural source of truth: natal chart wheel, sign/planet/aspect glyph maps, house rings, Home / Profile / Compare screens, starfield.
- `design/reference/galaxia-landing-v2.html` — the material source of truth: glass card recipe, blur, cosmic aura, gold hairlines, type scale, motion.

**When writing a spec, cite the file and the component.** Never describe a design in prose when a reference implementation exists. Say "port the `Wheel` component from `design/reference/galaxia.jsx`," not "add a chart wheel."

These files are reference, not build inputs. They are never imported by `apps/web`. They exist so humans and agents can read the actual code.

---

## 2. Configuration files that must not be touched

Deploys broke repeatedly because an agent rewrote infrastructure config it did not understand.

**Never modify without explicit human approval:**
- Vercel project settings (Root Directory = `apps/web`, Framework Preset = `Next.js`)
- Root `.npmrc` (`node-linker=hoisted`, required for Expo + pnpm)
- `apps/web/next.config.mjs` core config (you may extend `transpilePackages`, nothing else)
- `supabase/migrations/*` once applied (add a new migration; never edit an applied one)

There is deliberately **no root `vercel.json`.** Vercel's native Next.js detection with Root Directory `apps/web` is the working configuration. Do not add one back.

---

## 3. Work is not done until it is on `main` and deployed

An agent reported "implemented, build passes" for the entire web app. The work sat on an unmerged branch for weeks. `/welcome` and `/app` 404'd in production the whole time while everyone debugged the wrong layer.

**Definition of done, all five required:**
1. Code committed to a branch and pushed.
2. PR opened against `main`.
3. Merged to `main`.
4. Vercel deploy from `main` reaches **Ready**.
5. The change is verified on the live URL by loading it.

"The build passes locally" is not done. "I implemented it" is not done. An agent claiming completion must report: branch name, PR link, files changed, deploy status, live URL.

---

## 4. Diagnose before fixing

Every deploy failure in this project had a distinct root cause, and each guess-fix cost a cycle. Read the actual error. Trace it to a specific file, setting, or line. State the cause before proposing the fix.

Symptoms are not causes:
- "404 on a route" → is the file on `main`? is it in the build's route table?
- "white screen" → open the console; a route that builds can still throw at runtime
- "wrong design showing" → is the design in the repo at all?

When an agent cannot reproduce, it says so and asks. It does not guess.

---

## 5. One project per service

Two Supabase projects and two Vercel projects caused hours of confusion. Functions were deployed to the wrong backend; secrets were set on a project the code never called.

- **Supabase:** `eigfvribtntbxyjutsma` (GALAXIA org). This is the only Galaxia backend. `nsmkddufubobtmhypfho` is an unrelated project and must never appear in this codebase.
- **Vercel:** the `galaxia` project only. Root Directory `apps/web`, Framework `Next.js`.

Before deploying an edge function or setting a secret, confirm the project ref. The `sb-project-ref` response header tells you which project actually served a request.

---

## 6. Environment variables

- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- Mobile: same values, `EXPO_PUBLIC_` prefix
- Edge functions: Supabase **auto-injects** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Read them with `Deno.env.get`. You cannot set secrets with a `SUPABASE_` prefix; a function that requires you to is broken.
- Vela: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (currently `claude-sonnet-5`).

Never commit a key. Never print a key, a session ID, a user ID, or a project ref in the UI.

A function must fail with a readable message naming the missing variable, never a bare 500.

---

## 7. Nothing internal reaches the user

A shipped build once contained a button labeled `Upgrade to Galaxia+ (debug)`, a footer reading `Connected to shared Supabase account`, and a raw session UUID. For a product whose entire promise is "private by design," this is worse than an ugly screen.

Before any deploy, grep for: `debug`, `TODO`, `FIXME`, `Supabase`, `console.log`, raw UUIDs, backtick-wrapped route names in user copy.

A control that writes to the database must never be a debug toggle. The tier switch that let a user grant themselves a paid plan was a revenue bug, not a cosmetic one.

---

## 8. Astrology correctness is non-negotiable

The brand promise is "real astrology, real data, not AI making things up." Users will cross-check against astro.com.

- Tropical zodiac, **Placidus** houses, True Node. These match the reference sites users trust.
- Birth time is **local time at the birth place**, converted to UTC via that place's historical timezone including DST. Treating birth time as UTC produces a confidently wrong chart, which is worse than an incomplete one.
- Planet longitudes must match astro.com within ~0.1°; Ascendant within ~0.5°. Keep regression tests against known charts.
- Chart interpretation copy is a curated static library. The LLM never invents a placement. Vela interprets computed facts only.
- The engine is `@galaxia/astro`. An AI agent once replaced geocentric coordinates with heliocentric ones and its own tests passed because they tested its own wrong output. **Test against external ground truth, not self-consistency.**

---

## 9. Privacy rules that are load-bearing

- A user's notes about a person are private to that user. Never shared, never shown to the subject, never fed into a conversation the subject can see.
- No two-way AI chat with a minor. Guidance about a child is private to the parent.
- In a consented shared space, Vela never takes a side.

These are product promises made on the landing page. Code that violates them is a defect, regardless of how it looks.

---

## 10. Instructing AI coding agents

- Cite reference files and components, not prose descriptions.
- State explicitly what must not be touched (Section 2).
- Require a milestone: one deployed, verifiable vertical slice before broad work.
- Require the agent to report: root cause, branch, PR, files changed, deploy status, live URL.
- Never accept "it works" without a live URL you loaded yourself.
- Finalize the spec before the build starts. Mid-build spec changes are how we got three competing versions of the same screen.

---

## 11. Changes are recorded

Every meaningful change, decision, or reversal goes in `CHANGELOG.md` with a date and a reason. If we cannot reconstruct why something is the way it is, we will break it again.
