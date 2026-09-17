/**
 * Loaded faces from `apps/mobile/assets/fonts/` (same static TTFs as
 * `apps/web/app/s/[token]/opengraph-image/fonts/`). Keys match `useFonts`.
 * Do not pair these with `fontWeight: "700"` — each file is already a cut.
 */

export const fonts = {
  fraunces: "Fraunces-Regular",
  frauncesSemi: "Fraunces-SemiBold",
  inter: "Inter-Regular",
  interSemi: "Inter-SemiBold"
} as const;

export const galaxiaFontMap = {
  "Fraunces-Regular": require("../../assets/fonts/Fraunces-Regular.ttf"),
  "Fraunces-SemiBold": require("../../assets/fonts/Fraunces-SemiBold.ttf"),
  "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
  "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf")
} as const;
