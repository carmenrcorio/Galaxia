/**
 * Authored copy for the blog chart-reading capture. Chart paragraphs
 * themselves are never authored here: they come from interpretPlacement()
 * on computed data.
 */

/**
 * FOUNDER-REVIEW: helper under the birth-date fields.
 * The form collects month, day, and year, plus an optional place. It does
 * not collect a birth time, so the helper does not ask for one. A missing
 * date still emails a sample from a published chart (1987-12-29, Little Rock).
 */
export const CHART_READING_SAMPLE_NO_BIRTH_DATE =
  "We didn't have your birth date, so here's a sample reading to show you what Galaxia sees in a chart.";

export const CHART_READING_BIRTH_DATA_NOTE = "We calculate the chart from the date you enter.";

/** FOUNDER-REVIEW: heading for the birth-time help blurb. */
export const CHART_READING_TIME_HELP_LABEL = "How to find your birth time";

/** FOUNDER-REVIEW: default birth-time help, shown in the form. */
export const CHART_READING_TIME_HELP_SHORT =
  "Check your birth certificate or hospital records, or ask a parent. The exact time and place make your chart more accurate.";

/**
 * FOUNDER-REVIEW: alternate birth-time help. Stored only. Not rendered
 * until the founder chooses a surface for it.
 */
export const CHART_READING_TIME_HELP_WITTY =
  "Call your mom. She remembers, and she\u2019ll tell you more than you asked for. Your birth certificate has it too, and so do hospital records if she\u2019s not picking up. No luck? We\u2019ll still calculate the basics, but your rising sign and houses are worth one slightly awkward phone call.";

export const CHART_READING_SUBMIT = "Send my reading";

export const CHART_READING_CONFIRMATION = "The reading is on its way to that inbox.";

export const CHART_READING_SEND_FAILED = "Could not send the reading.";

export const CHART_READING_NETWORK_ERROR = "Something on our end broke. Try again in a moment.";

export const CHART_READING_NOT_SENT = "The reading could not be sent.";

export const CHART_READING_EMAIL_PLACEHOLDER = "you@example.com";

export const CHART_READING_NAME_PLACEHOLDER = "whose chart";

/** FOUNDER-REVIEW: visible optional mark. The field was already not required in HTML. */
export const CHART_READING_PLACE_LABEL = "Birth place (optional)";

export const CHART_READING_PLACE_PLACEHOLDER = "City (optional)";

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
