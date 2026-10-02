/**
 * Client-facing copy for the blog Galaxia Notes newsletter box.
 * Persistence lives in POST /api/chart-lead/newsletter-signup (chart-lead-upsert).
 */

/** FOUNDER-REVIEW */
export const NEWSLETTER_SUCCESS = "You are on the list. The next Galaxia Notes issue will land in your inbox.";

/** FOUNDER-REVIEW */
export const NEWSLETTER_INVALID_EMAIL = "Enter a valid email address.";

/** FOUNDER-REVIEW */
export const NEWSLETTER_RETRY = "Something went wrong. Try again in a moment.";

/** FOUNDER-REVIEW */
export const NEWSLETTER_RATE_LIMITED = "Too many tries. Wait a minute and try again.";

/** FOUNDER-REVIEW: presentational copy for the mid-article box. */
export const GALAXIA_NOTES_TITLE = "Galaxia Notes";

/** FOUNDER-REVIEW */
export const GALAXIA_NOTES_BODY = "Short notes on reading charts and relationships.";

/** FOUNDER-REVIEW */
export const GALAXIA_NOTES_SUBMIT = "Get Galaxia Notes";

/** FOUNDER-REVIEW */
export const GALAXIA_NOTES_EMAIL_PLACEHOLDER = "Your email";

/** FOUNDER-REVIEW: shown under the email field. */
export const GALAXIA_NOTES_FINE_PRINT_BEFORE = "About twice a month. Unsubscribe anytime. ";

/** FOUNDER-REVIEW */
export const GALAXIA_NOTES_PRIVACY_LINK = "Privacy";

export function newsletterErrorMessage(status: number): string {
  if (status === 400) return NEWSLETTER_INVALID_EMAIL;
  if (status === 429) return NEWSLETTER_RATE_LIMITED;
  return NEWSLETTER_RETRY;
}
