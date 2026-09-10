/**
 * Client UI settings for first-visit chrome and similar flags.
 *
 * Same get/set shape as the Settings page prefs (named key, read on mount,
 * write on change) and as `apps/mobile/src/lib/cache.ts`. Stored in
 * localStorage so a dismissible card does not need a profiles column.
 * Never used for astrology facts or access control.
 */

const PREFIX = "galaxia.setting.";

export const SETTING_GROUPS_INTRO_DISMISSED = "groupsIntroDismissed";

export function readUiSetting(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeUiSetting(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Private mode / quota: the card may reappear next visit. That is honest.
  }
}
