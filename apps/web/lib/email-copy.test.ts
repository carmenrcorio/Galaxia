import { describe, expect, it } from "vitest";
import {
  ALLOWED_TEMPLATE_VARS,
  DEFAULT_EMAIL_COPY,
  collectTemplateVars,
  fillTemplate,
  validateCampaignCopy,
  validateEmailCopy
} from "./email-copy";
import { AUTOMATION_EMAIL_KINDS } from "./email-kinds";

describe("fillTemplate", () => {
  it("fills known names and drops unknown ones rather than leaking braces", () => {
    expect(fillTemplate("Hi {{firstName}} {{missing}}.", { firstName: "Sam" }, "text")).toBe("Hi Sam .");
  });

  it("escapes HTML except for builtList", () => {
    expect(fillTemplate("x {{name}}", { name: "<b>Sam</b>" }, "html")).toBe("x &lt;b&gt;Sam&lt;/b&gt;");
    expect(fillTemplate("{{builtList}}", { builtList: "<ul><li>1</li></ul>" }, "html")).toBe("<ul><li>1</li></ul>");
  });
});

describe("validateEmailCopy", () => {
  it("ships a default for every automation kind", () => {
    for (const kind of AUTOMATION_EMAIL_KINDS) {
      expect(DEFAULT_EMAIL_COPY[kind].subject.length).toBeGreaterThan(0);
      expect(ALLOWED_TEMPLATE_VARS[kind]).toBeDefined();
    }
  });

  it("rejects an em dash and an astrology-first subject", () => {
    const dash = validateEmailCopy("trial.day1", {
      ...DEFAULT_EMAIL_COPY["trial.day1"],
      preview: "Add one more person — a year is enough."
    }, ["subject", "preview", "paragraphs"]);
    expect(dash.some((issue) => issue.field === "preview")).toBe(true);

    const astrology = validateEmailCopy("trial.day4_one", {
      ...DEFAULT_EMAIL_COPY["trial.day4_one"],
      subject: "Moon transits this week"
    }, ["subject", "preview", "paragraphs"]);
    expect(astrology.some((issue) => issue.field === "subject")).toBe(true);
  });

  it("rejects a variable this email cannot fill", () => {
    const issues = validateEmailCopy("trial.day1", {
      ...DEFAULT_EMAIL_COPY["trial.day1"],
      paragraphs: ["Hello {{copyResolved}}."]
    }, ["subject", "preview", "paragraphs"]);
    expect(issues.some((issue) => issue.field === "variables")).toBe(true);
  });

  it("collects every {{name}} across fields", () => {
    expect(collectTemplateVars(DEFAULT_EMAIL_COPY["trial.day1"]).sort()).toEqual(
      ["addedName", "circleSubject", "trialEndDate"].sort()
    );
  });
});

describe("validateCampaignCopy", () => {
  it("requires subject, preview, and a paragraph, and only firstName/greeting vars", () => {
    const empty = validateCampaignCopy({
      subject: "",
      preview: "",
      paragraphs: [],
      ctaLabel: null,
      ctaPathKey: null,
      firstEmailLine: null
    });
    expect(empty.map((issue) => issue.field).sort()).toEqual(["paragraphs", "preview", "subject"].sort());

    const badVar = validateCampaignCopy({
      subject: "Hello {{firstName}}",
      preview: "A note.",
      paragraphs: ["{{copyResolved}}"],
      ctaLabel: null,
      ctaPathKey: "app",
      firstEmailLine: null
    });
    expect(badVar.some((issue) => issue.field === "variables")).toBe(true);
  });
});
