import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAPTURE_MOMENT,
  MOMENT_DEK,
  MOMENT_NOTE_PLACEHOLDER,
  MOMENT_PAGE_TITLE,
  MOMENT_PIN,
  MOMENT_RECORD_KIND,
  MOMENT_REFLECTION_HEADING,
  MOMENT_SAVE,
  MOMENT_SKIP,
  MOMENT_SKY_ATTACHED
} from "./moment-copy";

const COPY_FILE = join(__dirname, "moment-copy.ts");

describe("moment-copy", () => {
  it("never uses em dashes in authored moment copy", () => {
    const src = readFileSync(COPY_FILE, "utf8");
    expect(src).not.toContain("\u2014");
    expect(src).not.toContain("\u2013");
    expect(CAPTURE_MOMENT).toBe("Capture a moment");
    expect(MOMENT_PAGE_TITLE).toBe("Sixty seconds");
    expect(MOMENT_DEK).toContain("The sky between you is attached automatically.");
    expect(MOMENT_NOTE_PLACEHOLDER).toBe("Two sentences is enough.");
    expect(MOMENT_SAVE).toBe("Save this moment");
    expect(MOMENT_SKY_ATTACHED).toContain("You never enter astrology data.");
    expect(MOMENT_REFLECTION_HEADING).toBe("Vela's reflection");
    expect(MOMENT_PIN).toBe("Pin this reflection");
    expect(MOMENT_SKIP).toBe("Skip");
    expect(MOMENT_RECORD_KIND).toBe("Moment");
  });
});
