## Real Terms of Service / Privacy Policy content, rendered verbatim (branch `cursor/legal-pages-content-5663`) — 2026-08-19

**Trigger**: `/terms` and `/privacy` were still placeholder marketing-style bullet copy (four `<li>`s of paraphrased "coaching, not medical advice" summary), not the founder-reviewed legal text. Pre-signup visitors need the real Terms and Privacy Policy.

`[ADDED]` **`content/legal/privacy-policy.md` and `content/legal/terms-of-service.md`.** Committed verbatim (byte-for-byte, diffed against the source files) at the repo root, outside `apps/web`, as the single source of truth for the legal text. Do not hand-edit wording in the page components — edit these files. The `[BRACKETED]` placeholders (`[LEGAL ENTITY NAME]`, `[GOVERNING STATE — ...]`, `[COUNTY/STATE]`, `[MAILING ADDRESS, ...]`) and the escaped markdown (`1\.`, `\[...\]`) are intentional and preserved as-is; a plain markdown parse unescapes `1\.` → `1.` without changing any word.

`[ADDED]` **`components/legal-document.tsx` + `lib/legal-content.ts`.** A shared `<LegalDocument markdown={...}>` renders the source markdown via `react-markdown` + `remark-gfm` (new deps, needed for the Section 7 subprocessor table), with element overrides mapping headings/paragraphs/lists/links/tables/`<hr>` onto new `.legal-doc-*` classes in `globals.css` — no override touches text nodes. `readLegalMarkdown()` does a build-time `fs.readFileSync` (both pages are static, no dynamic data, so this never runs at request time in production).

`[CHANGED]` **`apps/web/app/terms/page.tsx` and `apps/web/app/privacy/page.tsx`** now render `<LegalDocument>` instead of the hardcoded placeholder bullets. Both routes were already outside `middleware.ts`'s matcher (public, no auth) and already linked from `SiteFooter` and `SignupForm` — no changes needed there.

`[ADDED]` **`.legal-doc-*` styles in `globals.css`.** Serif (Fraunces) headings, `--mist`/`--cream` body copy at the shared `--measure` reading width, gold links — matches the existing marketing-page typography scale rather than inventing a new one. The Section 7 table wraps its `Purpose` column (`word-break: break-word`, no fixed `min-width`) so it reads fully at 390px with no horizontal scroll.

Verified: word-for-word diff of the rendered static HTML against the source markdown (both files) shows zero divergence beyond markdown syntax tokens (bullet `-` markers, link brackets) that render as real `<li>`/`<a>` elements instead of literal characters. `pnpm build`, `pnpm typecheck` (all 6 packages), and `pnpm test` (158/158) pass.
