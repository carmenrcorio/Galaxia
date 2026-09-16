/**
 * Site-wide Open Graph image at `/opengraph-image`.
 *
 * `app/[slug]/page.tsx` would otherwise 404 this path as a missing blog post.
 * This file-convention metadata route wins over that dynamic segment and
 * returns the branded 1200x630 card. Fonts are loaded lazily inside the
 * handler (never at module scope) for the same reason as
 * `s/[token]/opengraph-image.tsx`.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { HOMEPAGE_TAGLINE } from "../lib/homepage-seo";

export const alt = "Galaxia: astrology for understand the people in your life"; // FOUNDER-REVIEW
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#09091c";
const GOLD = "#d4a855";
const VIOLET = "#7c5fdb";
const CREAM = "#f4ecdb";
const MUTED = "#a99ec9";

const FONT_DIR = join(process.cwd(), "app/api/family-pattern-card/fonts");

type OgFont = { name: string; data: Buffer; weight: 400 | 600; style: "normal" | "italic" };

let fontsPromise: Promise<OgFont[]> | null = null;

async function loadSiteOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(join(FONT_DIR, "CormorantGaramond-Regular.ttf")),
      readFile(join(FONT_DIR, "CormorantGaramond-SemiBold.ttf")),
      readFile(join(FONT_DIR, "CormorantGaramond-Italic.ttf")),
      readFile(join(FONT_DIR, "DMSans-Regular.ttf")),
    ])
      .then(([regular, semibold, italic, dmSans]): OgFont[] => [
        { name: "Cormorant Garamond", data: regular, weight: 400, style: "normal" },
        { name: "Cormorant Garamond", data: semibold, weight: 600, style: "normal" },
        { name: "Cormorant Garamond", data: italic, weight: 400, style: "italic" },
        { name: "DM Sans", data: dmSans, weight: 400, style: "normal" },
      ])
      .catch((error: unknown) => {
        fontsPromise = null;
        throw error;
      });
  }
  return fontsPromise;
}

export default async function OpenGraphImage() {
  let fonts: OgFont[] | undefined;
  try {
    fonts = await loadSiteOgFonts();
  } catch (error) {
    console.error("opengraph-image: font load failed, rendering without custom fonts", error);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(circle at 50% 42%, ${VIOLET}55 0%, ${BG} 62%)`,
          color: CREAM,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", position: "absolute", top: 56, left: 92, width: 6, height: 6, borderRadius: 999, background: CREAM, opacity: 0.55 }} />
        <div style={{ display: "flex", position: "absolute", top: 118, left: 210, width: 3, height: 3, borderRadius: 999, background: GOLD, opacity: 0.7 }} />
        <div style={{ display: "flex", position: "absolute", top: 84, right: 128, width: 5, height: 5, borderRadius: 999, background: CREAM, opacity: 0.45 }} />
        <div style={{ display: "flex", position: "absolute", bottom: 96, right: 168, width: 4, height: 4, borderRadius: 999, background: GOLD, opacity: 0.55 }} />
        <div style={{ display: "flex", position: "absolute", bottom: 140, left: 150, width: 3, height: 3, borderRadius: 999, background: CREAM, opacity: 0.4 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Cormorant Garamond",
              fontSize: 96,
              fontWeight: 600,
              color: GOLD,
              lineHeight: 1.05,
            }}
          >
            Galaxia
          </div>
          <div
            style={{
              display: "flex",
              width: 220,
              height: 2,
              background: GOLD,
              marginTop: 10,
              marginBottom: 36,
              opacity: 0.85,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "Cormorant Garamond",
              fontSize: 42,
              fontWeight: 400,
              color: CREAM,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {HOMEPAGE_TAGLINE}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontFamily: "DM Sans",
              fontSize: 22,
              color: MUTED,
              textAlign: "center",
            }}
          >
            Not your horoscope. Astrology for the people closest to you.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
