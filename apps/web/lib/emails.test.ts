import { afterEach, describe, expect, it, vi } from "vitest";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import {
  constellationLetterEmail,
  constellationLetterHeaders,
  constellationLetterPreview,
  constellationLetterSubject,
  day1Email,
  day4MultiEmail,
  day4OneEmail,
  day11Email,
  day14Email,
  dispatchEmail,
  nudgeEmailHeaders,
  nudgeEmailPreview,
  nudgeEmailSubject,
  ownerGreeting,
  ownerNameMentionsInBody,
  sendEmail,
  skyTodayEmail,
  type TrialEmailData
} from "./emails";

const FOOTER_ENTITY = "Galaxia Mea LLC · 1 Shadowrock Ct, Simpsonville, SC 29680";
const FOOTER_WHY = "You are receiving this email because you signed up for Galaxia Mea.";

function trialBase(overrides: Partial<TrialEmailData> = {}): TrialEmailData {
  return {
    firstName: "Sam",
    personName: "Riley",
    peopleCount: 3,
    notesCount: 2,
    threadsCount: 1,
    groupsCount: 1,
    trialEndDate: "24 July",
    siteUrl: "https://galaxiamea.com",
    ...overrides
  };
}

const LAYER_ONE_SUBJECT_START = /^(astrology|sky|galaxy|natal|synastry|horoscope|transit|venus|mars|moon)\b/i;

describe("ownerGreeting", () => {
  it("uses the first name once, and only when one was captured", () => {
    expect(ownerGreeting("Sam")).toBe("Hi Sam,");
    expect(ownerGreeting("  Sam  ")).toBe("Hi Sam,");
  });

  it("falls back to a neutral Hi there, when no name was captured", () => {
    expect(ownerGreeting(null)).toBe("Hi there,");
    expect(ownerGreeting(undefined)).toBe("Hi there,");
    expect(ownerGreeting("")).toBe("Hi there,");
    expect(ownerGreeting("   ")).toBe("Hi there,");
  });
});

describe("nudgeEmailSubject — generic, name-only, structurally cannot leak copy_resolved", () => {
  it("takes only a name and never mentions a theme/domain word", () => {
    expect(nudgeEmailSubject("Alex")).toBe("Alex, today");
  });

  it("the function signature has exactly one parameter — no way to pass copy_resolved even by mistake", () => {
    expect(nudgeEmailSubject.length).toBe(1);
  });

  it("preview takes no arguments, so it cannot receive copy_resolved either", () => {
    expect(nudgeEmailPreview.length).toBe(0);
    expect(nudgeEmailPreview()).toBe("One note on how to show up for them.");
  });
});

describe("skyTodayEmail", () => {
  const base = {
    ownerFirstName: "Carmen",
    subjectPersonName: "Alex",
    copyResolved: "Venus trine your Moon today: a softer, more receptive stretch.",
    siteUrl: "https://galaxiamea.com",
    unsubscribeUrl: "https://galaxiamea.com/api/nudge-email/unsubscribe?token=abc-123"
  };

  it("subject matches nudgeEmailSubject and never contains copy_resolved text", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.subject).toBe(nudgeEmailSubject("Alex"));
    expect(rendered.subject).not.toContain("Venus");
    expect(rendered.subject).not.toContain("Moon");
    expect(rendered.subject).not.toMatch(LAYER_ONE_SUBJECT_START);
  });

  it("preview continues the subject, does not repeat it, and never contains copy_resolved", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.preview).toBe(nudgeEmailPreview());
    expect(rendered.preview).not.toBe(rendered.subject);
    expect(rendered.preview).not.toContain("Alex");
    expect(rendered.preview).not.toContain(base.copyResolved);
    expect(rendered.html).toContain(rendered.preview);
    expect(rendered.html).toContain("display:none");
  });

  it("greets by the resolved first name, never an email fragment, and only once", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain("Hi Carmen,");
    expect(rendered.text).toContain("Hi Carmen,");
    expect(ownerNameMentionsInBody(rendered.text, "Carmen")).toBe(1);
    expect(ownerNameMentionsInBody(rendered.html, "Carmen")).toBe(1);
  });

  it("falls back to Hi there, when no name was resolved — never derives one from an email", () => {
    const rendered = skyTodayEmail({ ...base, ownerFirstName: null });
    expect(rendered.html).toContain("Hi there,");
    expect(rendered.text).toContain("Hi there,");
    expect(rendered.html).not.toContain("Hi null");
    expect(rendered.html).not.toContain("Hi,");
  });

  it("states the subject person's name and renders copy_resolved verbatim", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain("Alex");
    expect(rendered.html).toContain(base.copyResolved);
    expect(rendered.text).toContain(base.copyResolved);
  });

  it("never wraps, truncates, or paraphrases copy_resolved", () => {
    const rendered = skyTodayEmail(base);
    // The exact sentence appears once, unmodified — not split across markup.
    expect(rendered.html.split(base.copyResolved)).toHaveLength(2);
  });

  it("includes the unsubscribe link in both html and text", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain(base.unsubscribeUrl);
    expect(rendered.text).toContain(base.unsubscribeUrl);
  });

  it("includes a button to /app", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain(`${base.siteUrl}/app`);
    expect(rendered.html).toContain("Open Galaxia");
  });

  it("includes the real legal entity and mailing address in the footer (CAN-SPAM)", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain("Galaxia Mea LLC");
    expect(rendered.html).toContain("1 Shadowrock Ct, Simpsonville, SC 29680");
    expect(rendered.text).toContain("Galaxia Mea LLC");
    expect(rendered.text).toContain("1 Shadowrock Ct, Simpsonville, SC 29680");
    expect(rendered.html).not.toContain("[MAILING ADDRESS]");
    expect(rendered.text).not.toContain("[MAILING ADDRESS]");
  });

  it("states why the recipient is receiving the email, alongside the unsubscribe link", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain(FOOTER_WHY);
    expect(rendered.text).toContain(FOOTER_WHY);
  });

  it("adds the why-you're-getting-this line only on the first email", () => {
    const first = skyTodayEmail({ ...base, isFirstEmail: true });
    const later = skyTodayEmail({ ...base, isFirstEmail: false });
    expect(first.html).toContain("You're getting this because you're a Galaxia member");
    expect(later.html).not.toContain("You're getting this because you're a Galaxia member");
  });

  it("no CHROME copy (subject, greeting, first-send line, footer) uses an em dash (founder style rule)", () => {
    // copy_resolved is authored elsewhere (copy-matrix) and is checked
    // verbatim here; this assertion is only about email chrome. Strip the
    // fixture body before checking the chrome this test actually authored.
    const rendered = skyTodayEmail({ ...base, isFirstEmail: true });
    const chromeHtml = rendered.html.replaceAll(base.copyResolved, "");
    const chromeText = rendered.text.replaceAll(base.copyResolved, "");
    expect(chromeHtml).not.toContain("\u2014");
    expect(chromeText).not.toContain("\u2014");
    expect(rendered.subject).not.toContain("\u2014");
    expect(rendered.preview).not.toContain("\u2014");
  });
});

describe("nudgeEmailHeaders — RFC 8058 one-click List-Unsubscribe pair", () => {
  it("sets both List-Unsubscribe and List-Unsubscribe-Post", () => {
    const headers = nudgeEmailHeaders("https://galaxiamea.com/api/nudge-email/unsubscribe?token=abc");
    expect(headers["List-Unsubscribe"]).toBe("<https://galaxiamea.com/api/nudge-email/unsubscribe?token=abc>");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("sendEmail — passes custom headers through to the Resend request body", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("includes the headers object when provided", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "re_test" }) });
    vi.stubGlobal("fetch", fetchMock);

    const headers = nudgeEmailHeaders("https://galaxiamea.com/api/nudge-email/unsubscribe?token=abc");
    await sendEmail("to@example.com", { subject: "Alex, today", preview: "One note.", html: "<p>hi</p>", text: "hi" }, headers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.headers).toEqual(headers);
  });

  it("omits the headers key entirely when none is passed (trial emails unaffected)", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "re_test" }) });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail("to@example.com", { subject: "s", preview: "p", html: "<p>hi</p>", text: "hi" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty("headers");
  });
});

describe("sendEmail — From address defaults to the verified galaxiamea.com sending domain", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("defaults `from` to a galaxiamea.com address when RESEND_FROM is unset", async () => {
    const priorResendFrom = process.env.RESEND_FROM;
    delete process.env.RESEND_FROM;
    try {
      vi.stubEnv("RESEND_API_KEY", "test-key");
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "re_test" }) });
      vi.stubGlobal("fetch", fetchMock);

      await sendEmail("to@example.com", { subject: "s", preview: "p", html: "<p>hi</p>", text: "hi" });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.from).toBe(`Galaxia <${GALAXIA_HELP_EMAIL}>`);
    } finally {
      if (priorResendFrom === undefined) delete process.env.RESEND_FROM;
      else process.env.RESEND_FROM = priorResendFrom;
    }
  });

  it("still honors RESEND_FROM when set (the documented override pattern)", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM", "Galaxia <custom@example.com>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "re_test" }) });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail("to@example.com", { subject: "s", preview: "p", html: "<p>hi</p>", text: "hi" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe("Galaxia <custom@example.com>");
  });
});

describe("Trial emails — rewritten voice, preview, greeting, CAN-SPAM footer", () => {
  const base = trialBase();
  const renderers: [string, (d: TrialEmailData) => ReturnType<typeof day1Email>][] = [
    ["day1Email", day1Email],
    ["day4MultiEmail", day4MultiEmail],
    ["day4OneEmail", day4OneEmail],
    ["day11Email", day11Email],
    ["day14Email", day14Email]
  ];

  for (const [name, render] of renderers) {
    it(`${name} includes the legal entity, mailing address, and unsubscribe link in both html and text`, () => {
      const rendered = render(base);
      expect(rendered.html).toContain("Galaxia Mea LLC");
      expect(rendered.html).toContain("1 Shadowrock Ct, Simpsonville, SC 29680");
      expect(rendered.html).toContain(`${base.siteUrl}/account/notifications`);
      expect(rendered.text).toContain("Galaxia Mea LLC");
      expect(rendered.text).toContain("1 Shadowrock Ct, Simpsonville, SC 29680");
      expect(rendered.text).toContain(`${base.siteUrl}/account/notifications`);
    });

    it(`${name} states why the recipient is receiving the email`, () => {
      const rendered = render(base);
      expect(rendered.html).toContain(FOOTER_WHY);
      expect(rendered.text).toContain(FOOTER_WHY);
    });

    it(`${name} footer copy never uses an em dash (founder style rule)`, () => {
      const rendered = render(base);
      expect(rendered.html.slice(rendered.html.indexOf("Galaxia Mea LLC"))).not.toContain("\u2014");
      expect(rendered.text.slice(rendered.text.indexOf("Galaxia Mea LLC"))).not.toContain("\u2014");
    });

    it(`${name} subject is layer one: under 45 chars on this fixture, no astrology-first vocab`, () => {
      const rendered = render(base);
      expect(rendered.subject.length).toBeLessThanOrEqual(45);
      expect(rendered.subject).not.toMatch(LAYER_ONE_SUBJECT_START);
      expect(rendered.subject).not.toContain("\u2014");
    });

    it(`${name} preview continues the subject and does not repeat it`, () => {
      const rendered = render(base);
      expect(rendered.preview.length).toBeGreaterThan(0);
      expect(rendered.preview).not.toBe(rendered.subject);
      expect(rendered.html).toContain(rendered.preview);
      expect(rendered.preview).not.toContain("\u2014");
    });

    it(`${name} greets by first name at most once`, () => {
      const rendered = render(base);
      expect(rendered.html).toContain("Hi Sam,");
      expect(ownerNameMentionsInBody(rendered.text, "Sam")).toBe(1);
      expect(ownerNameMentionsInBody(rendered.html, "Sam")).toBe(1);
    });

    it(`${name} greets Hi there, when no name was captured`, () => {
      const rendered = render(trialBase({ firstName: null }));
      expect(rendered.html).toContain("Hi there,");
      expect(rendered.text).toContain("Hi there,");
      expect(rendered.html).not.toContain("Hi null");
    });
  }

  it("day1 names the real person in the subject, and falls back without fabricating one", () => {
    expect(day1Email(base).subject).toBe("Riley is in your circle now");
    expect(day1Email(trialBase({ personName: undefined })).subject).toBe("Someone is in your circle now");
  });

  it("day4Multi names the real person in the subject, and falls back to they/need", () => {
    expect(day4MultiEmail(base).subject).toBe("What Riley needs from you");
    expect(day4MultiEmail(trialBase({ personName: undefined })).subject).toBe("What they need from you");
  });

  it("day4One subject is the outcome, not the product name", () => {
    expect(day4OneEmail(base).subject).toBe("Add one more person");
  });

  it("day11 subject uses the real trial end date", () => {
    expect(day11Email(base).subject).toBe("Your trial ends 24 July");
  });

  it("day14 has one primary action link, not two buttons", () => {
    const rendered = day14Email(base);
    expect(rendered.html).toContain("Pick up where you left off");
    expect(rendered.html).not.toContain("Tell us what was missing");
    expect(rendered.html).toContain(GALAXIA_HELP_EMAIL);
  });

  it("day14 feedback mailto uses the one Galaxia contact address", () => {
    const rendered = day14Email(base);
    expect(rendered.html).toContain(GALAXIA_HELP_EMAIL);
    expect(rendered.text).toContain(GALAXIA_HELP_EMAIL);
    expect(rendered.html).not.toContain(["galaxia", "app"].join("."));
    expect(rendered.text).not.toContain(["galaxia", "app"].join("."));
  });

  it("compliance footer entity line is unchanged from the merged CAN-SPAM copy", () => {
    const rendered = day1Email(base);
    expect(rendered.html).toContain(FOOTER_ENTITY);
    expect(rendered.html).toContain(`To unsubscribe, <a href="${base.siteUrl}/account/notifications"`);
  });
});

describe("constellationLetterEmail — a letter, not a report", () => {
  const base = {
    ownerFirstName: "Carmen",
    opening: "This week's letter is about Ada. The rest of the circle is quiet.",
    portraits: [
      {
        dynamicSentence: "Ada's Moon is meeting Saturn this week, in the same window as Mom.",
        intentionSentence: "One thing to try with Ada: name the weight out loud with them rather than trying to solve it."
      }
    ],
    personNames: ["Ada"],
    siteUrl: "https://galaxiamea.com",
    unsubscribeUrl: "https://galaxiamea.com/api/constellation-letter/unsubscribe?token=abc-123",
    openPixelUrl: "https://galaxiamea.com/api/constellation-letter/open?id=11111111-aaaa-4aaa-8aaa-000000000001",
    clickUrl: "https://galaxiamea.com/api/constellation-letter/go?id=11111111-aaaa-4aaa-8aaa-000000000001"
  };

  it("subject is layer one: names the person, no astrology-first vocab", () => {
    expect(constellationLetterSubject(["Ada"])).toBe("Ada, this week");
    expect(constellationLetterSubject(["Ada", "Mom"])).toBe("Ada and Mom, this week");
    expect(constellationLetterSubject(["Ada", "Mom", "Sam"])).toBe("This week in your circle");
    const rendered = constellationLetterEmail(base);
    expect(rendered.subject).toBe("Ada, this week");
    expect(rendered.subject).not.toMatch(LAYER_ONE_SUBJECT_START);
    expect(rendered.subject.length).toBeLessThanOrEqual(45);
  });

  it("preview continues the subject and does not repeat it", () => {
    const rendered = constellationLetterEmail(base);
    expect(rendered.preview).toBe(constellationLetterPreview());
    expect(rendered.preview).not.toBe(rendered.subject);
    expect(rendered.html).toContain(rendered.preview);
  });

  it("is prose: no headers, no bullet lists, no dashboard button", () => {
    const rendered = constellationLetterEmail(base);
    expect(rendered.html).not.toMatch(/<h[1-6]\b/i);
    expect(rendered.html).not.toMatch(/<ul\b/i);
    expect(rendered.html).not.toMatch(/<ol\b/i);
    expect(rendered.html).not.toContain("border-radius:100px");
    expect(rendered.html).toContain(base.opening);
    expect(rendered.html).toContain(base.portraits[0]!.dynamicSentence);
    expect(rendered.html).toContain(base.portraits[0]!.intentionSentence);
    expect(rendered.html).toContain(base.clickUrl);
    expect(rendered.html).toContain(base.openPixelUrl);
  });

  it("reuses the CAN-SPAM footer and RFC 8058 headers on its own unsubscribe URL", () => {
    const rendered = constellationLetterEmail(base);
    expect(rendered.html).toContain(FOOTER_ENTITY);
    expect(rendered.html).toContain(base.unsubscribeUrl);
    expect(rendered.text).toContain(base.unsubscribeUrl);
    expect(rendered.html).not.toContain("/api/nudge-email/unsubscribe");
    expect(rendered.html).not.toContain("\u2014");
    expect(rendered.text).not.toContain("\u2014");
    const headers = constellationLetterHeaders(base.unsubscribeUrl);
    expect(headers["List-Unsubscribe"]).toBe(`<${base.unsubscribeUrl}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("greets by first name at most once", () => {
    const rendered = constellationLetterEmail(base);
    expect(rendered.html).toContain("Hi Carmen,");
    expect(ownerNameMentionsInBody(rendered.text, "Carmen")).toBe(1);
  });
});

describe("dispatchEmail — tags, idempotency, and Resend id", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the Resend id and passes tags plus Idempotency-Key", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "re_abc" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchEmail(
      "to@example.com",
      { subject: "Ada, this week", preview: "Who.", html: "<p>hi</p>", text: "hi" },
      {
        tags: [{ name: "kind", value: "constellation-letter" }],
        idempotencyKey: "constellation-letter/owner/2026-09-13"
      }
    );

    expect(result).toEqual({ sent: true, id: "re_abc" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body as string);
    expect(body.tags).toEqual([{ name: "kind", value: "constellation-letter" }]);
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("constellation-letter/owner/2026-09-13");
  });
});
