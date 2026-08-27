# Fonts used by the `/s/[token]` OG image route

Satori (the renderer behind `next/og`'s `ImageResponse`) cannot use `next/font/google`
— it needs raw `.ttf`/`.otf` bytes read via `fs.readFile`. These files are static
instances derived from the same two families the rest of the app uses
(`Fraunces` in `app/layout.tsx`), plus one small merged glyph font for the
zodiac/planet symbols Fraunces and Inter do not contain.

All source fonts are SIL Open Font License 1.1 (OFL.txt below), from
[google/fonts](https://github.com/google/fonts):

- `Fraunces-Regular.ttf` / `Fraunces-SemiBold.ttf` — static instances pinned
  from `ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf` (wght 400/600,
  opsz 24/72, SOFT=0, WONK=0), subset to basic Latin + common punctuation.
- `Inter-Regular.ttf` / `Inter-SemiBold.ttf` — static instances pinned from
  `ofl/inter/Inter[opsz,wght].ttf` (wght 400/600, opsz 20), subset to basic
  Latin + common punctuation.
- `ZodiacGlyphs-Regular.ttf` — a merged subset of exactly the 22 codepoints
  used by `SIGN_GLYPH` + `BODY_GLYPH` (`lib/design.ts`): the 12 zodiac signs
  (`U+2648`-`U+2653`) from `ofl/notosanssymbols/NotoSansSymbols[wght].ttf`
  (wght 400), plus the Sun glyph (`U+2609`, the one codepoint that font is
  missing) from `ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf`. No
  aspect glyphs — the OG cards never render aspects. Satori automatically
  substitutes glyphs from this font for any codepoint missing in
  Fraunces/Inter (`fonts` array entries are not scoped to the CSS
  `fontFamily` of the text using them), so no per-span `fontFamily` override
  is needed in the route.

Regenerating: pull the variable font from the `google/fonts` path above,
pin the given axis values with `fonttools varLib.instancer`, then subset
with `pyftsubset` (Latin fonts: `--unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E"`;
glyph font: `--unicodes="U+2648-2653,U+2609,U+263D,U+263F,U+2640,U+2642-2647"`),
merging the two symbol subsets with `pyftmerge`.

Total: ~272KB across all five files, well inside the 500KB `ImageResponse`
bundle cap (JSX + CSS + fonts + images).
