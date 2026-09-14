/**
 * 1080x1080 group/family pattern card. Renders the already-stripped
 * first-name + signs payload only. Never recomputes a chart, never reads
 * birth date/time/place. Nothing is persisted.
 *
 * Fonts are bundled TTF files next to this route (see fonts/NOTICE.md).
 * Loaded lazily inside the handler, never at module scope, matching the
 * `/s/[token]/opengraph-image` gotcha: a Google Fonts fetch at render time
 * silently falls back to a generic serif in sandboxed environments.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import {
  FAMILY_PATTERN_CARD_FAIL,
  FAMILY_PATTERN_CARD_SIZE,
  parseFamilyPatternCardRequest,
} from "../../../lib/family-pattern-card";
import { FamilyPatternCardImage } from "../../../lib/family-pattern-card-view";

export const runtime = "nodejs";

const FONT_DIR = join(process.cwd(), "app/api/family-pattern-card/fonts");

type CardFont = { name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" | "italic" };

let fontsPromise: Promise<CardFont[]> | null = null;

async function loadPatternCardFonts(): Promise<CardFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(join(FONT_DIR, "CormorantGaramond-Regular.ttf")),
      readFile(join(FONT_DIR, "CormorantGaramond-SemiBold.ttf")),
      readFile(join(FONT_DIR, "CormorantGaramond-Italic.ttf")),
      readFile(join(FONT_DIR, "DMSans-Regular.ttf")),
      readFile(join(FONT_DIR, "DMSans-Medium.ttf")),
    ])
      .then(([cormorantRegular, cormorantSemiBold, cormorantItalic, dmSansRegular, dmSansMedium]): CardFont[] => [
        { name: "Cormorant Garamond", data: cormorantRegular, weight: 400, style: "normal" },
        { name: "Cormorant Garamond", data: cormorantSemiBold, weight: 600, style: "normal" },
        { name: "Cormorant Garamond", data: cormorantItalic, weight: 400, style: "italic" },
        { name: "DM Sans", data: dmSansRegular, weight: 400, style: "normal" },
        { name: "DM Sans", data: dmSansMedium, weight: 500, style: "normal" },
      ])
      .catch((error: unknown) => {
        fontsPromise = null;
        throw error;
      });
  }
  return fontsPromise;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseFamilyPatternCardRequest(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let fonts: CardFont[] | undefined;
  try {
    fonts = await loadPatternCardFonts();
  } catch (error) {
    console.error("family-pattern-card: font load failed, rendering without custom fonts", error);
  }

  try {
    return new ImageResponse(<FamilyPatternCardImage card={parsed} />, {
      ...FAMILY_PATTERN_CARD_SIZE,
      fonts,
    });
  } catch (error) {
    console.error("family-pattern-card: render failed", error);
    return NextResponse.json({ error: FAMILY_PATTERN_CARD_FAIL }, { status: 500 });
  }
}
