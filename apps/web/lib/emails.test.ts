import { afterEach, describe, expect, it, vi } from "vitest";
import {
  day1Email,
  day4MultiEmail,
  day4OneEmail,
  day11Email,
  day14Email,
  nudgeEmailHeaders,
  nudgeEmailSubject,
  sendEmail,
  skyTodayEmail,
  type TrialEmailData
} from "./emails";

describe("nudgeEmailSubject — generic, name-only, structurally cannot leak copy_resolved", () => {
  it("takes only a name and never mentions a theme/domain word", () => {
    expect(nudgeEmailSubject("Alex")).toBe("Your sky today, for Alex");
  });

  it("the function signature has exactly one parameter — no way to pass copy_resolved even by mistake", () => {
    expect(nudgeEmailSubject.length).toBe(1);
  });
});

describe("skyTodayEmail", () => {
  const base = {
    ownerFirstName: "Carmen",
    subjectPersonName: "Alex",
    copyResolved: "Venus trine your Moon today: a softer, more receptive stretch.",
    siteUrl: "https://galaxia.app",
    unsubscribeUrl: "https://galaxia.app/api/nudge-email/unsubscribe?token=abc-123"
  };

  it("subject matches nudgeEmailSubject and never contains copy_resolved text", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.subject).toBe(nudgeEmailSubject("Alex"));
    expect(rendered.subject).not.toContain("Venus");
    expect(rendered.subject).not.toContain("Moon");
  });

  it("greets by the resolved first name, never an email fragment", () => {
    const rendered = skyTodayEmail(base);
    expect(rendered.html).toContain("Hi Carmen,");
    expect(rendered.text).toContain("Hi Carmen,");
  });

  it("falls back to a nameless greeting when no name was resolved — never derives one from an email", () => {
    const rendered = skyTodayEmail({ ...base, ownerFirstName: null });
    expect(rendered.html).toContain("Hi,");
    expect(rendered.text).toContain("Hi,");
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
    expect(rendered.html).toContain("You are receiving this email because you signed up for Galaxia Mea.");
    expect(rendered.text).toContain("You are receiving this email because you signed up for Galaxia Mea.");
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
  });
});

describe("nudgeEmailHeaders — RFC 8058 one-click List-Unsubscribe pair", () => {
  it("sets both List-Unsubscribe and List-Unsubscribe-Post", () => {
    const headers = nudgeEmailHeaders("https://galaxia.app/api/nudge-email/unsubscribe?token=abc");
    expect(headers["List-Unsubscribe"]).toBe("<https://galaxia.app/api/nudge-email/unsubscribe?token=abc>");
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const headers = nudgeEmailHeaders("https://galaxia.app/api/nudge-email/unsubscribe?token=abc");
    await sendEmail("to@example.com", { subject: "Your sky today, for Alex", html: "<p>hi</p>", text: "hi" }, headers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.headers).toEqual(headers);
  });

  it("omits the headers key entirely when none is passed (trial emails unaffected)", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail("to@example.com", { subject: "s", html: "<p>hi</p>", text: "hi" });

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
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      await sendEmail("to@example.com", { subject: "s", html: "<p>hi</p>", text: "hi" });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.from).toContain("@galaxiamea.com");
      expect(body.from).not.toContain("@galaxia.app");
    } finally {
      if (priorResendFrom === undefined) delete process.env.RESEND_FROM;
      else process.env.RESEND_FROM = priorResendFrom;
    }
  });

  it("still honors RESEND_FROM when set (the documented override pattern)", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM", "Galaxia <custom@galaxiamea.com>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail("to@example.com", { subject: "s", html: "<p>hi</p>", text: "hi" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe("Galaxia <custom@galaxiamea.com>");
  });
});

describe("Trial emails — CAN-SPAM footer (legal entity, mailing address, working unsubscribe link)", () => {
  const base: TrialEmailData = {
    firstName: "Sam",
    personName: "Riley",
    peopleCount: 3,
    notesCount: 2,
    threadsCount: 1,
    groupsCount: 1,
    trialEndDate: "24 July",
    siteUrl: "https://galaxia.app"
  };
  const renderers: [string, (d: TrialEmailData) => { html: string; text: string }][] = [
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
      expect(rendered.html).toContain("You are receiving this email because you signed up for Galaxia Mea.");
      expect(rendered.text).toContain("You are receiving this email because you signed up for Galaxia Mea.");
    });

    it(`${name} footer copy never uses an em dash (founder style rule)`, () => {
      const rendered = render(base);
      expect(rendered.html.slice(rendered.html.indexOf("Galaxia Mea LLC"))).not.toContain("\u2014");
      expect(rendered.text.slice(rendered.text.indexOf("Galaxia Mea LLC"))).not.toContain("\u2014");
    });
  }
});
