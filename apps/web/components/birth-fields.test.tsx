// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BASE_BIRTH_INPUT, BirthFields } from "./birth-fields";

afterEach(() => {
  cleanup();
});

describe("BirthFields date selects", () => {
  it("gives month, day, and year id and name so Chrome can associate them", () => {
    render(<BirthFields input={BASE_BIRTH_INPUT} onChange={() => undefined} />);
    for (const field of ["month", "day", "year"] as const) {
      const el = screen.getByLabelText(new RegExp(`Birth ${field}`, "i"));
      expect(el.tagName).toBe("SELECT");
      expect(el.getAttribute("id")).toBe(`birth-${field}`);
      expect(el.getAttribute("name")).toBe(`birth-${field}`);
    }
  });

  it("namespaces ids when two forms share a page", () => {
    render(
      <>
        <BirthFields input={BASE_BIRTH_INPUT} onChange={() => undefined} idPrefix="person-a" />
        <BirthFields input={BASE_BIRTH_INPUT} onChange={() => undefined} idPrefix="person-b" />
      </>
    );
    expect(document.getElementById("person-a-month")).toBeTruthy();
    expect(document.getElementById("person-b-month")).toBeTruthy();
    expect(document.querySelectorAll("#person-a-month")).toHaveLength(1);
    expect(document.querySelectorAll("[name='person-a-year']")).toHaveLength(1);
    expect(document.querySelectorAll("[name='person-b-year']")).toHaveLength(1);
  });
});
