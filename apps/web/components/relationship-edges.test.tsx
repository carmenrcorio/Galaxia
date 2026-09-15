// @vitest-environment jsdom

/**
 * Person-page constellation-line picker: declared bonds only, partner
 * refused for a minor, remembrance never written or removed here.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalRelationshipPair } from "@galaxia/core";
import { RELATIONSHIP_PICKER_COPY, RelationshipEdgesBox } from "./relationship-edges";

const owner = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  display_name: "Carmen",
  is_self: true,
  is_minor: false,
  birth_date: "1990-05-01",
  birth_precision: "exact" as const,
};
const adult = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  display_name: "Alex",
  is_self: false,
  is_minor: false,
  birth_date: "1988-01-10",
  birth_precision: "exact" as const,
};
const child = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  display_name: "Sam",
  is_self: false,
  is_minor: false,
  birth_date: "2015-08-20",
  birth_precision: "exact" as const,
};

const inserts: unknown[] = [];
const deletes: Array<[string, string]> = [];
let peopleRows = [owner, adult, child];
let relRows: Array<{ person_a: string; person_b: string; relation_type: string }> = [];

function chain(table: string) {
  let mode: "select" | "delete" = "select";
  const obj: {
    select: () => typeof obj;
    insert: (row: unknown) => Promise<{ error: { code?: string; message: string } | null }>;
    delete: () => typeof obj;
    eq: (col: string, val: string) => typeof obj;
    order: () => typeof obj;
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>;
  } = {
    select() {
      mode = "select";
      return obj;
    },
    insert(row: unknown) {
      inserts.push(row);
      return Promise.resolve({ error: null });
    },
    delete() {
      deletes.length = 0;
      mode = "delete";
      return obj;
    },
    eq(col: string, val: string) {
      if (mode === "delete") deletes.push([col, val]);
      return obj;
    },
    order() {
      return obj;
    },
    then(resolve, reject) {
      const data = table === "people" ? peopleRows : relRows;
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };
  return obj;
}

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    from(table: string) {
      return chain(table);
    },
  }),
}));

afterEach(() => {
  cleanup();
  inserts.length = 0;
  deletes.length = 0;
  peopleRows = [owner, adult, child];
  relRows = [];
});

describe("RelationshipEdgesBox", () => {
  it("writes a canonical friend row and does not insert remembrance", async () => {
    render(
      <RelationshipEdgesBox
        person={owner}
        userId="owner-1"
        subjectIsMinor={false}
      />
    );
    await screen.findByText(RELATIONSHIP_PICKER_COPY.noneYet);
    fireEvent.click(screen.getByText(RELATIONSHIP_PICKER_COPY.eyebrow));
    fireEvent.change(screen.getByLabelText(RELATIONSHIP_PICKER_COPY.personLabel), {
      target: { value: adult.id },
    });
    fireEvent.change(screen.getByLabelText(RELATIONSHIP_PICKER_COPY.typeLabel), {
      target: { value: "friend" },
    });
    fireEvent.click(screen.getByRole("button", { name: RELATIONSHIP_PICKER_COPY.add }));
    await waitFor(() => expect(inserts).toHaveLength(1));
    const pair = canonicalRelationshipPair(owner.id, adult.id);
    expect(inserts[0]).toEqual({
      owner_id: "owner-1",
      person_a: pair.person_a,
      person_b: pair.person_b,
      relation_type: "friend",
    });
  });

  it("refuses partner when the subject is a minor and does not insert", async () => {
    render(
      <RelationshipEdgesBox
        person={{ ...child, is_minor: true }}
        userId="owner-1"
        subjectIsMinor
      />
    );
    await screen.findByText(RELATIONSHIP_PICKER_COPY.noneYet);
    fireEvent.click(screen.getByText(RELATIONSHIP_PICKER_COPY.eyebrow));
    fireEvent.change(screen.getByLabelText(RELATIONSHIP_PICKER_COPY.personLabel), {
      target: { value: owner.id },
    });
    fireEvent.change(screen.getByLabelText(RELATIONSHIP_PICKER_COPY.typeLabel), {
      target: { value: "partner" },
    });
    expect(screen.getByText(RELATIONSHIP_PICKER_COPY.partnerRefuse)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: RELATIONSHIP_PICKER_COPY.add }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: RELATIONSHIP_PICKER_COPY.add }));
    expect(inserts).toHaveLength(0);
  });

  it("lists declared bonds, skips remembrance, and deletes only that type", async () => {
    const pair = canonicalRelationshipPair(owner.id, adult.id);
    relRows = [
      { ...pair, relation_type: "friend" },
      { ...pair, relation_type: "remembrance" },
    ];
    render(
      <RelationshipEdgesBox
        person={owner}
        userId="owner-1"
        subjectIsMinor={false}
      />
    );
    await screen.findByText("Alex · Friend");
    expect(screen.queryByText(/Remembrance/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove Friend with Alex" }));
    await waitFor(() => expect(deletes.some(([col, val]) => col === "relation_type" && val === "friend")).toBe(true));
    expect(deletes).toContainEqual(["relation_type", "friend"]);
    expect(deletes).not.toContainEqual(["relation_type", "remembrance"]);
    expect(deletes).toContainEqual(["person_a", pair.person_a]);
    expect(deletes).toContainEqual(["person_b", pair.person_b]);
  });
});
