/**
 * Loaded faces from `apps/mobile/assets/fonts/` (same static TTFs as
 * `apps/web/app/s/[token]/opengraph-image/fonts/`). Keys match `useFonts`.
 * Do not pair these with `fontWeight: "700"` — each file is already a cut.
 * ZodiacGlyphs covers the 22 SIGN_GLYPH / BODY_GLYPH codepoints Inter and
 * Fraunces do not contain.
 */

export const fonts = {
  fraunces: "Fraunces-Regular",
  frauncesSemi: "Fraunces-SemiBold",
  inter: "Inter-Regular",
  interSemi: "Inter-SemiBold",
  zodiac: "ZodiacGlyphs-Regular"
} as const;

export const galaxiaFontMap = {
  "Fraunces-Regular": require("../../assets/fonts/Fraunces-Regular.ttf"),
  "Fraunces-SemiBold": require("../../assets/fonts/Fraunces-SemiBold.ttf"),
  "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
  "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
  "ZodiacGlyphs-Regular": require("../../assets/fonts/ZodiacGlyphs-Regular.ttf")
} as const;
