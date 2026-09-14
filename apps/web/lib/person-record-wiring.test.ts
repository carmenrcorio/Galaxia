import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("source wiring: person Record search stays owner-only and keeps the compose box", () => {
  it("person page keeps the existing note input and mounts the searchable timeline", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/app/person/[id]/page.tsx"),
      "utf8"
    );
    expect(src).toContain('placeholder="Log a private moment, pattern, or thing to remember…"');
    expect(src).toContain('"Add to the record"');
    expect(src).toContain(
      'await supabase.from("notes").insert({ owner_id: userId, about_person: person.id, body: noteDraft.trim() })'
    );
    expect(src).not.toMatch(/insert\(\{[^}]*tags/);
    expect(src).toContain("PersonRecordTimeline");
    expect(src).toContain("updateNoteTags");
    expect(src).toContain("widenRecordSearch");
    expect(src).toContain("fetchRecord(supabase, uid, { personId: actualId }, 200)");
    expect(src).toContain("fetchRecord(supabase, userId, { personId: person.id }, 200, filters)");
  });

  it("fetchRecord always filters notes by owner_id and uses FTS on plaintext body", () => {
    const src = readFileSync(resolve(__dirname, "./record.ts"), "utf8");
    expect(src).toContain('.eq("owner_id", ownerId)');
    expect(src).toContain('textSearch("body", fts, { type: "plain", config: "english" })');
    expect(src).toContain('.eq("id", noteId)');
    expect(src).toContain('.eq("owner_id", ownerId)');
    expect(src).toContain("update({ tags: sanitizeRecordTags(tags) })");
    expect(src).not.toContain("drop policy");
  });
});
