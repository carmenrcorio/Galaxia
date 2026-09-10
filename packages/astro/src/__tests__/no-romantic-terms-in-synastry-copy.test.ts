/**
 * PERMANENT GATE: no reading `short` or `long` in SYNASTRY_PAIR may contain
 * language that only reads correctly for a romantic pair.
 *
 * WHY THIS EXISTS (read this before adding a term or an entry):
 * AspectKey (conjunction | sextile | square | trine | opposition) has no
 * relation-type dimension, and interpretSynastryAspect(a, b, aspect) has no
 * "romantic" vs "parent-child" vs "ancestor" branch. The exact same string,
 * keyed only on a body pair and an aspect type, renders on a couple's compare
 * page AND on a parent reading about their own child AND on a grandchild
 * reading about an ancestor, unedited. PASS 1 (the 7 personal/social bodies,
 * 105 entries) shipped 15 strings, concentrated in mars-venus, that assumed a
 * romantic reader ("chemistry," "attraction," "desire," "passion," "magnetic,"
 * one that said to "want each other" and "rub each other"). They rendered on
 * parent-child and ancestor comparisons in production, unreviewed, for a full
 * pass before anyone caught it, because nothing structural checked for this.
 * This test is that structural check. See the header comment above
 * SYNASTRY_PAIR in ../synastry-interpretations.ts for the full writeup.
 *
 * TERM LIST: derived from a manual audit of every string then in the file,
 * not guessed. `flirt` and `seduce` are included pre-emptively even though
 * neither currently appears in any authored string, because they are the next
 * obvious romance-coded leak for a future PASS 3 entry.
 */
import { describe, expect, it } from "vitest";
import { SYNASTRY_PAIR } from "../synastry-interpretations";
import type { AspectKey } from "../interpretations";

/**
 * Case-insensitive and word-boundary-anchored: `\battract\w*` catches
 * "attraction", "attract", and "attracts" (the `\w*` grabs the suffix) but
 * requires a real word start, so it does not fire inside an unrelated word
 * that merely happens to contain the same letters (e.g. it does not match
 * "distracted" or "contract" — neither contains the substring "attract" at
 * all, and the leading `\b` additionally guards against any word that does).
 * The two phrases are matched as literal, already-specific word sequences.
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bchemistry\w*/i,
  /\bdesir\w*/i,
  /\battract\w*/i, // covers both "attraction" and "attract" from the approved list
  /\bmagnetic\w*/i,
  /\bpassion\w*/i,
  /\bwant each other\b/i,
  /\brub each other\b/i,
  /\bflirt\w*/i,
  /\bseduc\w*/i,
];

interface Violation {
  pairKey: string;
  aspect: AspectKey;
  field: "short" | "long";
  term: string;
  text: string;
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const [pairKey, byAspect] of Object.entries(SYNASTRY_PAIR)) {
    for (const [aspect, reading] of Object.entries(byAspect)) {
      if (!reading) continue;
      for (const field of ["short", "long"] as const) {
        const text = reading[field];
        for (const pattern of FORBIDDEN_PATTERNS) {
          const match = pattern.exec(text);
          if (match) {
            violations.push({ pairKey, aspect: aspect as AspectKey, field, term: match[0], text });
          }
        }
      }
    }
  }
  return violations;
}

describe("forbidden-term pattern matching (sanity check on the regexes themselves)", () => {
  it("attract catches attraction and attracts, but not distracted or contract", () => {
    const pattern = /\battract\w*/i;
    expect(pattern.test("the attraction is immediate")).toBe(true);
    expect(pattern.test("the same heat that attracts")).toBe(true);
    expect(pattern.test("do not get distracted")).toBe(false);
    expect(pattern.test("sign the contract")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(/\bchemistry\w*/i.test("Chemistry")).toBe(true);
    expect(/\bmagnetic\w*/i.test("MAGNETIC")).toBe(true);
  });

  it("phrase patterns require the exact sequence, not just the individual words", () => {
    const wantEachOther = /\bwant each other\b/i;
    expect(wantEachOther.test("you want each other and you rub each other")).toBe(true);
    expect(wantEachOther.test("you want the best for each other")).toBe(false);
  });
});

describe("no romantic/sexual/possessive-charge terms in SYNASTRY_PAIR readings", () => {
  it("fails and names the pair, aspect, field, and matched term for every violation", () => {
    const violations = findViolations();
    const message = violations
      .map(
        (v) =>
          `${v.pairKey} / ${v.aspect} / ${v.field}: contains "${v.term}" — "${v.text}"`
      )
      .join("\n");
    expect(violations, message).toEqual([]);
  });
});
