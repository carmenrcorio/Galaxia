/**
 * Authored copy for the blog chart-reading capture. Every user-visible
 * string is tagged FOUNDER-REVIEW. Chart paragraphs themselves are never
 * authored here: they come from interpretPlacement() on computed data.
 */

/** FOUNDER-REVIEW: one-line framing above the blog capture form. */
export const CHART_READING_FRAMING =
  "We compute a real reading from the birth data you give, or from a published chart if you leave that blank.";

/** FOUNDER-REVIEW: submit button. */
export const CHART_READING_SUBMIT = "Send my reading";

/** FOUNDER-REVIEW: confirmation after a successful submit. No exclamation. */
export const CHART_READING_CONFIRMATION = "The reading is on its way to that inbox.";

/** FOUNDER-REVIEW: form send failure. */
export const CHART_READING_SEND_FAILED = "Could not send the reading.";

/** FOUNDER-REVIEW: form network error. */
export const CHART_READING_NETWORK_ERROR = "Network error. Please try again.";

/** FOUNDER-REVIEW: API send failure after capture. */
export const CHART_READING_NOT_SENT = "The reading could not be sent.";

/** FOUNDER-REVIEW: email field placeholder. */
export const CHART_READING_EMAIL_PLACEHOLDER = "you@example.com";

/** FOUNDER-REVIEW: optional name field placeholder. */
export const CHART_READING_NAME_PLACEHOLDER = "whose chart";

/** FOUNDER-REVIEW: optional city field placeholder. */
export const CHART_READING_PLACE_PLACEHOLDER = "city";

/** FOUNDER-REVIEW: invalid email. */
export const CHART_READING_INVALID_EMAIL = "That email does not look like an address.";

/** FOUNDER-REVIEW: rate limit. */
export const CHART_READING_RATE_LIMITED =
  "Three readings per day from this address is the cap. Try again tomorrow.";

/** FOUNDER-REVIEW: closing line in the email. Soft relational angle, not a hard CTA. */
export const CHART_READING_CLOSING_LINE =
  "The same lens, pointed at someone you love, is what Galaxia is built for.";

/** FOUNDER-REVIEW: when birth data was given but no placement settled. */
export const CHART_READING_NO_SETTLED_PLACEMENT =
  "None of the placements we write from settled on this date, so there is no paragraph to send from this chart.";

/** FOUNDER-REVIEW: unsubscribe confirmation. */
export const CHART_READING_UNSUBSCRIBED =
  "You're unsubscribed from blog chart reading emails.";

export function chartReadingEmailSubject(moonSign: string | null): string {
  // FOUNDER-REVIEW: subject. Moon sign when we have one; never "Your astrology reading".
  return moonSign ? `What a ${moonSign} Moon actually does` : "A reading from a real chart";
}

export function chartReadingEmailPreview(): string {
  // FOUNDER-REVIEW: preview. Continues the subject; does not repeat it.
  return "Three placements, in the words we already have.";
}

export function chartReadingOpeningLine(opts: {
  personName: string | null;
  sample: boolean;
  sunSign?: string;
  moonSign?: string;
}): string {
  if (opts.sample && opts.sunSign && opts.moonSign) {
    // FOUNDER-REVIEW: fallback opening. Names the real published chart's Sun and Moon.
    return `Here is what a real chart reading looks like -- this one is for a ${opts.sunSign} with ${opts.moonSign} Moon.`;
  }
  if (opts.sample) {
    // FOUNDER-REVIEW: fallback opening when a sign did not settle.
    return "Here is what a real chart reading looks like.";
  }
  const name = (opts.personName ?? "").trim();
  // FOUNDER-REVIEW: opening. Not a greeting. Not a thanks.
  return name ? `Here is ${name}'s reading.` : "Here is your reading.";
}

export function placementLabel(bodyLabel: string, sign: string): string {
  // FOUNDER-REVIEW: placement label prefix. ASCII --, never U+2014.
  return `${bodyLabel} in ${sign} --`;
}
