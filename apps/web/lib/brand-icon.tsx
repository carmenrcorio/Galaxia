import { ImageResponse } from "next/og";

/** Galaxia icon ground. */
export const BRAND_ICON_NAVY = "#0a0b1a";
/** Galaxia icon mark. */
export const BRAND_ICON_GOLD = "#d4a855";

/**
 * App Router icon ImageResponse. Same geometry as `lib/brand-icon.svg`
 * (deep navy ground, gold four-point star) so `icon.tsx` / `apple-icon.tsx`
 * and the static PNG/ICO files stay one mark. No fonts: Satori's default
 * is enough, and a module-scope font read would risk the same metadata
 * crash `opengraph-image.tsx` already documented.
 */
export function brandIconImage(size: number): ImageResponse {
  const star = Math.round(size * 0.72);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BRAND_ICON_NAVY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <svg width={star} height={star} viewBox="0 0 32 32">
          <path
            fill={BRAND_ICON_GOLD}
            d="M16 3.2 L18.55 13.45 L28.8 16 L18.55 18.55 L16 28.8 L13.45 18.55 L3.2 16 L13.45 13.45 Z"
          />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
