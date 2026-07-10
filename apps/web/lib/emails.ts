/**
 * Trial emails. Copy is VERBATIM from design/galaxia-pricing-copy.md §3, except
 * the Day-11 email which uses the approved card-optional rewrite (no "you'll be
 * charged" — there is no card on file). Every number is a real per-user count
 * passed in by the caller; nothing is fabricated.
 */

export type TrialEmailKind = "day1" | "day4_one" | "day4_multi" | "day11" | "day14";

export interface TrialEmailData {
  firstName: string;
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
  html: string;
  text: string;
}

const INK = "#0a0717";
const CREAM = "#F4ECDB";
const MIST = "#b9aede";
const GOLD = "#E6AE6C";

function shell(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:${INK};color:${CREAM};font-family:-apple-system,Segoe UI,Inter,sans-serif;line-height:1.65">
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

/** Day 1 — after they add their first person. */
export function day1Email(d: TrialEmailData): RenderedEmail {
  const subject = "Your sky has one star in it";
  const html = shell(
    p(`Hi ${d.firstName},`) +
      p(`You've added ${d.personName ?? "someone"}. That's a start.`) +
      p("Galaxia gets more useful with every person you add — a partner, a parent, a sibling, the friend who became family. The comparison, the generational layer, the constellation itself: none of it works with one person in it.") +
      p("The people you have the least information about still belong here. A birth year alone is enough to place someone in your sky.") +
      button("Add someone else →", `${d.siteUrl}/welcome`) +
      p(`Your trial runs through ${d.trialEndDate}. Nothing will be charged before then.`)
  );
  const text = `Hi ${d.firstName},\n\nYou've added ${d.personName ?? "someone"}. That's a start.\n\nGalaxia gets more useful with every person you add — a partner, a parent, a sibling, the friend who became family. The comparison, the generational layer, the constellation itself: none of it works with one person in it.\n\nThe people you have the least information about still belong here. A birth year alone is enough to place someone in your sky.\n\nAdd someone else: ${d.siteUrl}/welcome\n\nYour trial runs through ${d.trialEndDate}. Nothing will be charged before then.`;
  return { subject, html, text };
}

/** Day 4 — if they have 2+ people. */
export function day4MultiEmail(d: TrialEmailData): RenderedEmail {
  const subject = `What ${d.personName ?? "they"} needs from you`;
  const html = shell(
    p(`Hi ${d.firstName},`) +
      p(`You've mapped ${d.peopleCount} people. Here's the part most people miss:`) +
      p(`Open <strong style="color:${CREAM}">Compare</strong>, choose two of them, and read the "what they need from you" section. It's built from their actual placements — where you flow, where you catch, and what each of you is asking for without saying it.`) +
      p("It's the closest thing Galaxia has to the whole point.") +
      button("Compare two people →", `${d.siteUrl}/app/compare`)
  );
  const text = `Hi ${d.firstName},\n\nYou've mapped ${d.peopleCount} people. Here's the part most people miss:\n\nOpen Compare, choose two of them, and read the "what they need from you" section. It's built from their actual placements — where you flow, where you catch, and what each of you is asking for without saying it.\n\nIt's the closest thing Galaxia has to the whole point.\n\nCompare two people: ${d.siteUrl}/app/compare`;
  return { subject, html, text };
}

/** Day 4 — if they have only 1 person (the at-risk path). */
export function day4OneEmail(d: TrialEmailData): RenderedEmail {
  const subject = "Galaxia needs one more person";
  const html = shell(
    p(`Hi ${d.firstName},`) +
      p("Right now your galaxy has one star in it, and almost nothing in Galaxia works with one star.") +
      p("Add one person — your partner, your mother, your oldest friend — and the app becomes what it's for: a way to understand the people you actually live your life beside.") +
      p("If you don't have their birth time, that's fine. A date works. A year works.") +
      button("Add someone →", `${d.siteUrl}/welcome`)
  );
  const text = `Hi ${d.firstName},\n\nRight now your galaxy has one star in it, and almost nothing in Galaxia works with one star.\n\nAdd one person — your partner, your mother, your oldest friend — and the app becomes what it's for: a way to understand the people you actually live your life beside.\n\nIf you don't have their birth time, that's fine. A date works. A year works.\n\nAdd someone: ${d.siteUrl}/welcome`;
  return { subject, html, text };
}

/** Day 11 — the honest reminder, card-optional rewrite (approved). */
export function day11Email(d: TrialEmailData): RenderedEmail {
  const subject = "Three days left in your trial";
  const list = `<ul style="color:${MIST};margin:0 0 14px;padding-left:18px">
    <li><strong style="color:${CREAM}">${d.peopleCount}</strong> people in your galaxy</li>
    <li><strong style="color:${CREAM}">${d.notesCount}</strong> private notes, visible only to you</li>
    <li><strong style="color:${CREAM}">${d.threadsCount}</strong> conversations with Vela</li>
    <li><strong style="color:${CREAM}">${d.groupsCount}</strong> constellations you named</li>
  </ul>`;
  const html = shell(
    p(`Hi ${d.firstName},`) +
      p(`Your free trial of Galaxia ends on ${d.trialEndDate}, three days from now. We never asked for a card, so nothing will be charged — when the trial ends, your galaxy simply pauses until you choose to continue.`) +
      p("Here's what you've built:") +
      list +
      p("All of it stays saved. If you continue, it's exactly where you left it — no limits, no upgrade, no second tier.") +
      button("Continue with Galaxia →", `${d.siteUrl}/subscribe`) +
      p("Thank you for trying this.")
  );
  const text = `Hi ${d.firstName},\n\nYour free trial of Galaxia ends on ${d.trialEndDate}, three days from now. We never asked for a card, so nothing will be charged — when the trial ends, your galaxy simply pauses until you choose to continue.\n\nHere's what you've built:\n- ${d.peopleCount} people in your galaxy\n- ${d.notesCount} private notes, visible only to you\n- ${d.threadsCount} conversations with Vela\n- ${d.groupsCount} constellations you named\n\nAll of it stays saved. If you continue, it's exactly where you left it — no limits, no upgrade, no second tier.\n\nContinue with Galaxia: ${d.siteUrl}/subscribe\n\nThank you for trying this.`;
  return { subject, html, text };
}

/** Day 14 — trial ended, not converted. */
export function day14Email(d: TrialEmailData): RenderedEmail {
  const subject = "Your galaxy is still here";
  const html = shell(
    p(`Hi ${d.firstName},`) +
      p("Your trial has ended and we haven't charged you.") +
      p(`Everything you built is saved — ${d.peopleCount} people, your notes, your charts. Nothing has been deleted. If you come back next week or next year, it's exactly where you left it.`) +
      button("Pick up where you left off →", `${d.siteUrl}/app`) +
      p("And if it wasn't right for you: would you tell us why? One line is enough. It goes straight to the person who built this.") +
      button("Tell us what was missing", "mailto:support@galaxia.app?subject=What%20was%20missing")
  );
  const text = `Hi ${d.firstName},\n\nYour trial has ended and we haven't charged you.\n\nEverything you built is saved — ${d.peopleCount} people, your notes, your charts. Nothing has been deleted. If you come back next week or next year, it's exactly where you left it.\n\nPick up where you left off: ${d.siteUrl}/app\n\nAnd if it wasn't right for you: would you tell us why? One line is enough. It goes straight to the person who built this.\n\nTell us what was missing: support@galaxia.app`;
  return { subject, html, text };
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
 * Send via Resend. No-ops (logs) when RESEND_API_KEY is absent, so the cron is
 * safe to run before the key is configured. Returns true if actually sent.
 */
export async function sendEmail(to: string, email: RenderedEmail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[emails] RESEND_API_KEY absent — skipping "${email.subject}" to ${to}`);
    return false;
  }
  const from = process.env.RESEND_FROM ?? "Galaxia <hello@galaxia.app>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject: email.subject, html: email.html, text: email.text })
  });
  if (!res.ok) {
    console.error(`[emails] Resend failed (${res.status}) for "${email.subject}" to ${to}`);
    return false;
  }
  return true;
}
