/**
 * Authored copy for the blog chart-reading capture. Chart paragraphs
 * themselves are never authored here: they come from interpretPlacement()
 * on computed data.
 */

export const CHART_READING_FRAMING =
  "We compute a real reading from the birth data you give, or from a published chart if you leave that blank.";

export const CHART_READING_SUBMIT = "Send my reading";

export const CHART_READING_CONFIRMATION = "The reading is on its way to that inbox.";

export const CHART_READING_SEND_FAILED = "Could not send the reading.";

export const CHART_READING_NETWORK_ERROR = "Something on our end broke. Try again in a moment.";

export const CHART_READING_NOT_SENT = "The reading could not be sent.";

export const CHART_READING_EMAIL_PLACEHOLDER = "you@example.com";

export const CHART_READING_NAME_PLACEHOLDER = "whose chart";

export const CHART_READING_PLACE_PLACEHOLDER = "city";

export const CHART_READING_INVALID_EMAIL = "That email does not look like an address.";

export const CHART_READING_RATE_LIMITED =
  "Three readings per day from this address is the cap. Try again tomorrow.";

export const CHART_READING_CLOSING_LINE =
  "The same lens, pointed at someone you love, is what Galaxia is built for.";

export const CHART_READING_NO_SETTLED_PLACEMENT =
  "None of the placements we write from settled on this date, so there is no paragraph to send from this chart.";

export const CHART_READING_UNSUBSCRIBED =
  "You're unsubscribed from blog chart reading emails.";

export function chartReadingEmailSubject(moonSign: string | null): string {
  return moonSign ? `What a ${moonSign} Moon actually does` : "A reading from a real chart";
}

export function chartReadingEmailPreview(): string {
  return "Three placements, in the words we already have.";
}

export function chartReadingOpeningLine(opts: {
  personName: string | null;
  sample: boolean;
  sunSign?: string;
  moonSign?: string;
}): string {
  if (opts.sample && opts.sunSign && opts.moonSign) {
    return `Here is what a real chart reading looks like -- this one is for a ${opts.sunSign} with ${opts.moonSign} Moon.`;
  }
  if (opts.sample) {
    return "Here is what a real chart reading looks like.";
  }
  const name = (opts.personName ?? "").trim();
  return name ? `Here is ${name}'s reading.` : "Here is your reading.";
}

export function placementLabel(bodyLabel: string, sign: string): string {
  return `${bodyLabel} in ${sign} --`;
}
