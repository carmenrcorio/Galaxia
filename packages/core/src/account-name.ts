/**
 * The one answer to "what do we call the signed-in user?"
 *
 * Every greeting and every account header reads the name through
 * `resolveAccountName` so the answer cannot drift per screen. Before this
 * existed there were three independent copies of the decision: `/account`
 * resolved profile name then self-person name, `/app` home resolved
 * `profiles.display_name ?? email.split("@")[0]`, and mobile home had a third
 * copy of that same email fallback. A user who typed a real name during
 * onboarding was still greeted by the local part of their email address.
 *
 * Precedence, highest first:
 *   1. `profiles.display_name`, the name the user explicitly set on their account.
 *   2. `people.display_name` where `is_self`, the name they gave their own chart
 *      during onboarding.
 *   3. Nothing. `name` is null and the caller shows an honest empty state.
 *
 * An email address is never a name. It is returned separately as
 * `identityLabel`, for an account header that still has to identify which
 * account you are looking at when no name has been captured yet. It is never
 * returned as `name` or `firstName`, so no greeting can ever address a person by
 * their email address or by a fragment of it.
 *
 * There is deliberately no cleanup heuristic here. A stored `display_name` is
 * taken at face value even if it happens to look like an email local part,
 * because guessing that a stored name is "not really a name" would also reject
 * people who genuinely go by that string. The fix for bad stored values is at
 * the write side (nothing derives a name from an email any more), not here.
 */

/** The two stored fields a name can come from, plus the login email. */
export interface AccountNameSources {
  /** `profiles.display_name`. The name the user set on their account. */
  profileDisplayName?: string | null;
  /** `people.display_name` for the row where `is_self` is true. */
  selfPersonName?: string | null;
  /** The login email. Used only for `identityLabel`, never as a name. */
  email?: string | null;
}

/** Which stored field the name came from, or null when there is no name. */
export type AccountNameSource = "profile" | "self-person" | null;

export interface ResolvedAccountName {
  /** The person's full name, or null when no name has been captured. Never an email. */
  name: string | null;
  /** First word of the name, for greetings. Null when there is no name. Never an email. */
  firstName: string | null;
  /** Which stored field won, for surfaces that explain where the name came from. */
  source: AccountNameSource;
  /** True when a real name exists. Use this to choose between name and email copy. */
  hasName: boolean;
  /**
   * What to show in an account header: the name when there is one, otherwise the
   * full email so the account is still identifiable. Null when neither exists.
   * Never a fragment of an email presented as a name.
   */
  identityLabel: string | null;
}

/** Trim, and collapse internal whitespace runs, so " Ana   Maria " reads as "Ana Maria". */
function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function resolveAccountName(sources: AccountNameSources = {}): ResolvedAccountName {
  const profileName = normalize(sources.profileDisplayName);
  const selfName = normalize(sources.selfPersonName);
  const email = normalize(sources.email);

  const name = profileName || selfName || null;
  const source: AccountNameSource = profileName ? "profile" : selfName ? "self-person" : null;

  return {
    name,
    firstName: name ? name.split(" ")[0] : null,
    source,
    hasName: name !== null,
    identityLabel: name ?? (email || null)
  };
}

/**
 * Split a stored full name into the first and last name fields that signup and
 * the account screen collect. The first word is the first name and everything
 * after it is the last name, so "Ana Maria de la Cruz" keeps "de la Cruz"
 * intact instead of dropping the parts a two-field form cannot hold.
 *
 * `splitFullName` and `joinFullName` round trip exactly, which is what lets one
 * `display_name` column stay the single source of truth while the forms present
 * two fields.
 */
export function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const normalized = normalize(fullName);
  if (!normalized) return { firstName: "", lastName: "" };
  const firstSpace = normalized.indexOf(" ");
  if (firstSpace === -1) return { firstName: normalized, lastName: "" };
  return { firstName: normalized.slice(0, firstSpace), lastName: normalized.slice(firstSpace + 1) };
}

/** Join first and last name into the single value stored in `profiles.display_name`. */
export function joinFullName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return normalize(`${normalize(firstName)} ${normalize(lastName)}`);
}
