/**
 * Marketing emails: five trial lifecycle emails, the daily nudge, the
 * weekly constellation letter, and the public blog chart-reading email.
 * Subjects are voice layer one (`design/galaxia-voice-layers.md`): outcome
 * or a real person, never astrology vocabulary first. Bodies may use inner
 * vocabulary once the recipient is already a member. Every number and
 * person name is a real per-user value passed in by the caller; nothing is
 * fabricated. GoTrue system emails (magic link, password reset, signup
 * confirmation) are out of scope: they never pass through this module.
 */

import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import {
  CHART_READING_CLOSING_LINE,
  chartReadingEmailPreview,
  chartReadingEmailSubject,
  chartReadingOpeningLine,
  placementLabel
} from "./chart-reading-copy";
import { BODY_LABEL, type ChartReading } from "./chart-reading";
import { EMAIL_PATHS } from "./nav-links";

export type TrialEmailKind = "day1" | "day4_one" | "day4_multi" | "day11" | "day14";

export interface TrialEmailData {
  /** From resolveAccountName(...).firstName. Null when no name was captured. Never an email fragment. */
  firstName: string | null;
  personName?: string;
  peopleCount: number;
  notesCount: number;
  threadsCount: number;
  groupsCount: number;
  trialEndDate: string; // already formatted, e.g. "24 July"
  siteUrl: string;
}

export interface RenderedEmail {
  subject: string;
  /** Inbox / lock-screen snippet. Continues the subject; never repeats it. */
  preview: string;
  html: string;
  text: string;
}

const INK = "#0a0717";
const CREAM = "#F4ECDB";
const MIST = "#b9aede";
const GOLD = "#E6AE6C";

/**
 * Hidden inbox preview. Padding stops clients from pulling the first body
 * sentence into the lock-screen snippet after a short preview.
 */
function preheader(preview: string): string {
  const pad = Array.from({ length: 80 }, () => "&nbsp;&zwnj;").join("");
  return `<div style="display:none;font-size:1px;color:${INK};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preview}${pad}</div>`;
}

function shell(bodyHtml: string, preview: string): string {
  return `<!doctype html><html><body style="margin:0;background:${INK};color:${CREAM};font-family:-apple-system,Segoe UI,Inter,sans-serif;line-height:1.65">
    ${preheader(preview)}
    <div style="max-width:520px;margin:0 auto;padding:32px 24px">
      <div style="font-family:Georgia,serif;font-size:22px;color:${GOLD};margin-bottom:24px">Galaxia</div>
      ${bodyHtml}
      <p style="color:#8076a6;font-size:12px;margin-top:32px">The people you love, written in the stars.</p>
    </div>
  </body></html>`;
}

function button(label: string, href: string): string {
  return `<p style="margin:22px 0"><a href="${href}" style="background:${GOLD};color:#1a1206;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:100px;display:inline-block">${label}</a></p>`;
}

function p(text: string): string {
  return `<p style="color:${MIST};margin:0 0 14px">${text}</p>`;
}

/**
 * CAN-SPAM footer: real legal entity + physical mailing address + a working
 * opt-out link, required on every commercial email (nudges, trial emails,
 * digests, any promotional content). Never added to a purely transactional
 * email (password reset, magic link) — those are sent by Supabase Auth's own
 * GoTrue templates, not through this module, so there is nothing to add it
 * to here. `unsubscribeUrl` is caller-provided so each email kind can point
 * at whichever opt-out mechanism actually governs it (the nudge email's own
 * no-login token route for `skyTodayEmail`; the account notification
 * settings page for the trial emails, which have no separate consent flag).
 */
const LEGAL_ENTITY_ADDRESS_LINE = `Galaxia Mea LLC · 1 Shadowrock Ct, Simpsonville, SC 29680 · ${GALAXIA_HELP_EMAIL}`;

function complianceFooterHtml(unsubscribeUrl: string): string {
  return `<p style="color:#8076a6;font-size:11px;margin-top:28px;line-height:1.6">
        ${LEGAL_ENTITY_ADDRESS_LINE}<br /><br />
        You are receiving this email because you signed up for Galaxia Mea. To unsubscribe, <a href="${unsubscribeUrl}" style="color:#8076a6;text-decoration:underline">visit this link</a>.
      </p>`;
}

function complianceFooterText(unsubscribeUrl: string): string {
  return `${LEGAL_ENTITY_ADDRESS_LINE}\n\nYou are receiving this email because you signed up for Galaxia Mea. To unsubscribe, visit: ${unsubscribeUrl}`;
}

/**
 * Trial emails have no per-category consent flag of their own (unlike the
 * nudge email's `daily_nudge_emails_enabled` + token route), so their
 * opt-out link points at the account notification settings page rather
 * than a token that would resolve to the wrong toggle.
 */
function trialUnsubscribeUrl(siteUrl: string): string {
  return `${siteUrl}${EMAIL_PATHS.notifications}`;
}

export function ownerGreeting(firstName: string | null | undefined): string {
  const name = (firstName ?? "").trim();
  return name ? `Hi ${name},` : "Hi there,";
}

function countNameMentions(haystack: string, name: string): number {
  if (!name) return 0;
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  return haystack.match(re)?.length ?? 0;
}

/** Exported for tests: the recipient's first name appears at most once (the greeting). */
export function ownerNameMentionsInBody(body: string, firstName: string | null | undefined): number {
  const name = (firstName ?? "").trim();
  if (!name) return 0;
  return countNameMentions(body, name);
}

/** Day 1 — after they add their first person. */
export function day1Email(d: TrialEmailData): RenderedEmail {
  const person = d.personName?.trim();
  const subject = person ? `${person} is in your circle now` : "Someone is in your circle now";
  const preview = "Add one more person. A year is enough.";
  const greeting = ownerGreeting(d.firstName);
  const unsubscribeUrl = trialUnsubscribeUrl(d.siteUrl);
  const addedLine = person ? `You've added ${person}.` : "You've added someone.";
  const nextLine = "Add one more person. A date is enough. A year is enough.";
  const trialLine = `Your trial runs through ${d.trialEndDate}. Nothing will be charged before then.`;
  const html = shell(
    p(greeting) +
      p(addedLine) +
      p(nextLine) +
      button("Add someone else →", `${d.siteUrl}${EMAIL_PATHS.welcome}`) +
      p(trialLine) +
      complianceFooterHtml(unsubscribeUrl),
    preview
  );
  const text = `${greeting}\n\n${addedLine}\n\n${nextLine}\n\nAdd someone else: ${d.siteUrl}${EMAIL_PATHS.welcome}\n\n${trialLine}\n\n${complianceFooterText(unsubscribeUrl)}`;
  return { subject, preview, html, text };
}

/** Day 4 — if they have 2+ people. */
export function day4MultiEmail(d: TrialEmailData): RenderedEmail {
  const person = d.personName?.trim();
  const subject = person ? `What ${person} needs from you` : "What they need from you";
  const preview = "Open Compare. It's built from their charts.";
  const greeting = ownerGreeting(d.firstName);
  const unsubscribeUrl = trialUnsubscribeUrl(d.siteUrl);
  const mappedLine = `You've mapped ${d.peopleCount} people.`;
  const actionLine = `Open <strong style="color:${CREAM}">Compare</strong>, choose two of them, and read what they need from you. It's built from their actual placements.`;
  const actionText = "Open Compare, choose two of them, and read what they need from you. It's built from their actual placements.";
  const html = shell(
    p(greeting) +
      p(mappedLine) +
      p(actionLine) +
      button("Compare two people →", `${d.siteUrl}${EMAIL_PATHS.compare}`) +
      complianceFooterHtml(unsubscribeUrl),
    preview
  );
  const text = `${greeting}\n\n${mappedLine}\n\n${actionText}\n\nCompare two people: ${d.siteUrl}${EMAIL_PATHS.compare}\n\n${complianceFooterText(unsubscribeUrl)}`;
  return { subject, preview, html, text };
}

/** Day 4 — if they have only 1 person (the at-risk path). */
export function day4OneEmail(d: TrialEmailData): RenderedEmail {
  const person = d.personName?.trim();
  const subject = "Add one more person";
  const preview = "A date works. A year works.";
  const greeting = ownerGreeting(d.firstName);
  const unsubscribeUrl = trialUnsubscribeUrl(d.siteUrl);
  const factLine = person
    ? `You've added ${person}. Almost nothing here works with one person.`
    : "Almost nothing here works with one person.";
  const nextLine = "Add someone you actually live beside. A date works. A year works.";
  const html = shell(
    p(greeting) +
      p(factLine) +
      p(nextLine) +
      button("Add someone →", `${d.siteUrl}${EMAIL_PATHS.welcome}`) +
      complianceFooterHtml(unsubscribeUrl),
    preview
  );
  const text = `${greeting}\n\n${factLine}\n\n${nextLine}\n\nAdd someone: ${d.siteUrl}${EMAIL_PATHS.welcome}\n\n${complianceFooterText(unsubscribeUrl)}`;
  return { subject, preview, html, text };
}

/** Day 11 — the honest reminder, card-optional rewrite (approved). */
export function day11Email(d: TrialEmailData): RenderedEmail {
  const subject = `Your trial ends ${d.trialEndDate}`;
  const preview = "Nothing will be charged. Everything stays saved.";
  const greeting = ownerGreeting(d.firstName);
  const unsubscribeUrl = trialUnsubscribeUrl(d.siteUrl);
  const endsLine = `Your trial ends on ${d.trialEndDate}. We never asked for a card, so nothing will be charged. When it ends, access pauses until you choose to continue.`;
  const listHtml = `<ul style="color:${MIST};margin:0 0 14px;padding-left:18px">
    <li><strong style="color:${CREAM}">${d.peopleCount}</strong> people</li>
    <li><strong style="color:${CREAM}">${d.notesCount}</strong> private notes, visible only to you</li>
    <li><strong style="color:${CREAM}">${d.threadsCount}</strong> conversations with Vela</li>
    <li><strong style="color:${CREAM}">${d.groupsCount}</strong> constellations you named</li>
  </ul>`;
  const stayLine = "All of it stays saved. If you continue, it's exactly where you left it.";
  const html = shell(
    p(greeting) +
      p(endsLine) +
      p("Here's what you've built:") +
      listHtml +
      p(stayLine) +
      button("Continue with Galaxia →", `${d.siteUrl}${EMAIL_PATHS.subscribe}`) +
      complianceFooterHtml(unsubscribeUrl),
    preview
  );
  const text = `${greeting}\n\n${endsLine}\n\nHere's what you've built:\n- ${d.peopleCount} people\n- ${d.notesCount} private notes, visible only to you\n- ${d.threadsCount} conversations with Vela\n- ${d.groupsCount} constellations you named\n\n${stayLine}\n\nContinue with Galaxia: ${d.siteUrl}${EMAIL_PATHS.subscribe}\n\n${complianceFooterText(unsubscribeUrl)}`;
  return { subject, preview, html, text };
}

/** Day 14 — trial ended, not converted. */
export function day14Email(d: TrialEmailData): RenderedEmail {
  const subject = "Your people are still here";
  const preview = "Nothing was deleted. Come back whenever.";
  const greeting = ownerGreeting(d.firstName);
  const unsubscribeUrl = trialUnsubscribeUrl(d.siteUrl);
  const endedLine = "Your trial has ended. We haven't charged you.";
  const savedLine = `Everything you built is saved. ${d.peopleCount} people, your notes, your charts. Nothing has been deleted.`;
  const feedbackLine = `If it wasn't right, one line to ${GALAXIA_HELP_EMAIL} is enough. It goes to the person who built this.`;
  const html = shell(
    p(greeting) +
      p(endedLine) +
      p(savedLine) +
      button("Pick up where you left off →", `${d.siteUrl}${EMAIL_PATHS.app}`) +
      p(feedbackLine) +
      complianceFooterHtml(unsubscribeUrl),
    preview
  );
  const text = `${greeting}\n\n${endedLine}\n\n${savedLine}\n\nPick up where you left off: ${d.siteUrl}${EMAIL_PATHS.app}\n\n${feedbackLine}\n\n${complianceFooterText(unsubscribeUrl)}`;
  return { subject, preview, html, text };
}

export function renderTrialEmail(kind: TrialEmailKind, d: TrialEmailData): RenderedEmail {
  switch (kind) {
    case "day1": return day1Email(d);
    case "day4_one": return day4OneEmail(d);
    case "day4_multi": return day4MultiEmail(d);
    case "day11": return day11Email(d);
    case "day14": return day14Email(d);
  }
}

/**
 * Optional custom headers for a send — currently only used for the nudge
 * email's RFC 8058 one-click List-Unsubscribe pair (see `nudgeEmailHeaders`).
 * Kept generic rather than a fixed shape so a future sender doesn't need a
 * new sendEmail overload.
 */
export type EmailHeaders = Record<string, string>;

export type SendEmailTag = { name: string; value: string };

export type SendEmailDispatch = {
  headers?: EmailHeaders;
  tags?: SendEmailTag[];
  idempotencyKey?: string;
};

export type SendEmailResult = { sent: boolean; id: string | null };

/**
 * Send via Resend. No-ops (logs) when RESEND_API_KEY is absent, so the cron is
 * safe to run before the key is configured. Returns whether the request was
 * accepted and the Resend email id when Resend returns one.
 */
export async function dispatchEmail(
  to: string,
  email: RenderedEmail,
  options?: SendEmailDispatch
): Promise<SendEmailResult> {
  const { createHash } = await import("node:crypto");
  const recipientId = createHash("sha256").update(to).digest("hex").slice(0, 12);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[emails] skipped ${recipientId}: RESEND_API_KEY absent, skipping "${email.subject}"`);
    return { sent: false, id: null };
  }
  const from = process.env.RESEND_FROM ?? `Galaxia <${GALAXIA_HELP_EMAIL}>`;
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
  if (options?.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(options?.headers ? { headers: options.headers } : {}),
      ...(options?.tags ? { tags: options.tags } : {})
    })
  });
  if (!res.ok) {
    console.error(`[emails] send failed for ${recipientId} (${res.status}): "${email.subject}"`);
    return { sent: false, id: null };
  }
  let id: string | null = null;
  try {
    const json = (await res.json()) as { id?: unknown };
    if (typeof json.id === "string" && json.id.length > 0) id = json.id;
  } catch {
    id = null;
  }
  return { sent: true, id };
}

/**
 * Send via Resend. No-ops (logs) when RESEND_API_KEY is absent, so the cron is
 * safe to run before the key is configured. Returns true if actually sent.
 */
export async function sendEmail(to: string, email: RenderedEmail, headers?: EmailHeaders): Promise<boolean> {
  const result = await dispatchEmail(to, email, headers ? { headers } : undefined);
  return result.sent;
}

/**
 * "Your sky today" — nudge delivery Phase B2. Renders `copy_resolved`
 * VERBATIM; no new safety/precision logic here — minor_safe and
 * precision_mode are already baked into copy_resolved by the copy resolver
 * (packages/astro/src/transit-nudge/resolve-copy.ts) at generation time. The
 * caller (the nudge-send cron) is solely responsible for making sure this is
 * only ever called with a NON-minor row's copy_resolved and subject name —
 * this function has no minor check of its own and must never grow one that
 * could be bypassed instead of the caller's gate.
 */
export interface SkyTodayEmailData {
  /** From resolveAccountName(...).firstName — never derived from an email address. */
  ownerFirstName: string | null;
  /** display_name of the person the leading nudge is about (never a minor — enforced by the caller). */
  subjectPersonName: string;
  /** copy_resolved, verbatim. Never wrapped, truncated, or re-derived. */
  copyResolved: string;
  siteUrl: string;
  unsubscribeUrl: string;
  /**
   * True only for the very first nudge email a given owner ever receives.
   * daily_nudge_emails_enabled defaults to true (opt-out, locked decision),
   * so every existing account is opted in without ever having asked for
   * this — the first email adds one honest sentence explaining why it
   * arrived, on top of (not instead of) the unsubscribe link every email has.
   */
  isFirstEmail?: boolean;
}

/**
 * Generic, name-only subject. Deliberately takes ONLY the subject person's
 * name — no `copy_resolved`, no theme/domain word can leak into an inbox or
 * lock-screen preview because this function's signature never receives them.
 */
export function nudgeEmailSubject(subjectPersonName: string): string {
  return `${subjectPersonName}, today`;
}

export function nudgeEmailPreview(): string {
  return "One note on how to show up for them.";
}

export function skyTodayEmail(d: SkyTodayEmailData): RenderedEmail {
  const subject = nudgeEmailSubject(d.subjectPersonName);
  const preview = nudgeEmailPreview();
  const greeting = ownerGreeting(d.ownerFirstName);
  const firstEmailLine = d.isFirstEmail
    ? "You're getting this because you're a Galaxia member. Turn it off any time from the link below."
    : null;
  const leadLineHtml = `For <strong style="color:${CREAM}">${d.subjectPersonName}</strong> today:`;
  const leadLineText = `For ${d.subjectPersonName} today:`;

  const html = shell(
    p(greeting) +
      p(leadLineHtml) +
      p(d.copyResolved) +
      (firstEmailLine ? p(firstEmailLine) : "") +
      button("Open Galaxia →", `${d.siteUrl}${EMAIL_PATHS.app}`) +
      complianceFooterHtml(d.unsubscribeUrl),
    preview
  );

  const text = [
    greeting,
    "",
    leadLineText,
    "",
    d.copyResolved,
    firstEmailLine ? `\n${firstEmailLine}` : "",
    "",
    `Open Galaxia: ${d.siteUrl}${EMAIL_PATHS.app}`,
    "",
    complianceFooterText(d.unsubscribeUrl)
  ].filter((line) => line !== "").join("\n");

  return { subject, preview, html, text };
}

/**
 * RFC 8058 one-click List-Unsubscribe headers. `unsubscribeUrl` must be the
 * SAME url as the visible footer link in `skyTodayEmail` — the send job's
 * unsubscribe route handles both a mail-client POST (blank 200/202, no
 * confirmation page) and a human GET (confirmation page) at that one URL.
 */
export function nudgeEmailHeaders(unsubscribeUrl: string): EmailHeaders {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  };
}

export interface ConstellationLetterPortraitCopy {
  dynamicSentence: string;
  intentionSentence: string;
}

export interface ConstellationLetterEmailData {
  ownerFirstName: string | null;
  opening: string;
  portraits: ConstellationLetterPortraitCopy[];
  personNames: string[];
  siteUrl: string;
  unsubscribeUrl: string;
  openPixelUrl: string;
  clickUrl: string;
}


export function constellationLetterSubject(personNames: string[]): string {
  if (personNames.length === 1) {
    const subject = `${personNames[0]}, this week`;
    return subject.length <= 45 ? subject : "This week in your circle";
  }
  if (personNames.length === 2) {
    const subject = `${personNames[0]} and ${personNames[1]}, this week`;
    return subject.length <= 45 ? subject : "This week in your circle";
  }
  return "This week in your circle";
}


export function constellationLetterPreview(): string {
  return "Who in your circle has something real moving.";
}

export function constellationLetterEmail(d: ConstellationLetterEmailData): RenderedEmail {
  const subject = constellationLetterSubject(d.personNames);
  const preview = constellationLetterPreview();
  const greeting = ownerGreeting(d.ownerFirstName);
  const ctaHtml = `If you want the same sky on the screen, <a href="${d.clickUrl}" style="color:${GOLD};text-decoration:underline">open this week in Galaxia</a>.`;
  const ctaText = `If you want the same sky on the screen, open this week in Galaxia: ${d.clickUrl}`;
  const portraitHtml = d.portraits
    .map((portrait) => p(portrait.dynamicSentence) + p(portrait.intentionSentence))
    .join("");
  const portraitText = d.portraits
    .flatMap((portrait) => [portrait.dynamicSentence, "", portrait.intentionSentence, ""])
    .join("\n");
  const pixel = `<img src="${d.openPixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />`;

  const html = shell(
    p(greeting) +
      p(d.opening) +
      portraitHtml +
      p(ctaHtml) +
      pixel +
      complianceFooterHtml(d.unsubscribeUrl),
    preview
  );

  const text = [
    greeting,
    "",
    d.opening,
    "",
    portraitText.trimEnd(),
    "",
    ctaText,
    "",
    complianceFooterText(d.unsubscribeUrl)
  ].join("\n");

  return { subject, preview, html, text };
}

export function constellationLetterHeaders(unsubscribeUrl: string): EmailHeaders {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  };
}

const READING_FONT = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FRAME_FONT = "'DM Sans', -apple-system, Segoe UI, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function goldRule(): string {
  return `<div style="height:1px;background:${GOLD};opacity:.45;margin:22px 0;line-height:1;font-size:1px">&nbsp;</div>`;
}

function chartReadingShell(bodyHtml: string, preview: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=DM+Sans:wght@400;500&display=swap');</style>
    </head>
    <body style="margin:0;background:${INK};color:${CREAM};font-family:${FRAME_FONT};line-height:1.65">
    ${preheader(preview)}
    <div style="max-width:520px;margin:0 auto;padding:32px 24px">
      ${bodyHtml}
    </div>
  </body></html>`;
}

function frameP(text: string): string {
  return `<p style="color:${MIST};margin:0 0 14px;font-family:${FRAME_FONT}">${text}</p>`;
}

function readingP(label: string, text: string): string {
  return `<p style="color:${CREAM};margin:0;font-family:${READING_FONT};font-size:18px;line-height:1.7"><strong style="color:${GOLD};font-weight:500">${escapeHtml(label)}</strong> ${escapeHtml(text)}</p>`;
}

export interface ChartReadingEmailData {
  reading: ChartReading;
  unsubscribeUrl: string;
}

export function chartReadingEmail(d: ChartReadingEmailData): RenderedEmail {
  const subject = chartReadingEmailSubject(d.reading.moonSign);
  const preview = chartReadingEmailPreview();
  const opening = chartReadingOpeningLine({
    personName: d.reading.personName,
    sample: d.reading.sample,
    sunSign: d.reading.sunSign ?? undefined,
    moonSign: d.reading.moonSign ?? undefined
  });
  const placementBlocks = d.reading.placements.map((placement) => {
    const label = placementLabel(BODY_LABEL[placement.body], placement.sign);
    return { label, text: placement.text };
  });
  const emptyNote = d.reading.emptyNote;

  const htmlParts: string[] = [frameP(escapeHtml(opening))];
  if (emptyNote) {
    htmlParts.push(goldRule(), frameP(escapeHtml(emptyNote)));
  }
  for (const block of placementBlocks) {
    htmlParts.push(goldRule(), readingP(block.label, block.text));
  }
  htmlParts.push(goldRule(), frameP(escapeHtml(CHART_READING_CLOSING_LINE)));
  htmlParts.push(complianceFooterHtml(d.unsubscribeUrl));

  const textParts = [
    opening,
    "",
    emptyNote ? `${emptyNote}\n` : "",
    ...placementBlocks.flatMap((block) => [`${block.label} ${block.text}`, ""]),
    CHART_READING_CLOSING_LINE,
    "",
    complianceFooterText(d.unsubscribeUrl)
  ].filter((line) => line !== "");

  return {
    subject,
    preview,
    html: chartReadingShell(htmlParts.join(""), preview),
    text: textParts.join("\n")
  };
}

export function chartReadingEmailHeaders(unsubscribeUrl: string): EmailHeaders {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  };
}

export {
  chartReadingEmailPreview,
  chartReadingEmailSubject,
  chartReadingOpeningLine
} from "./chart-reading-copy";

