/**
 * Client UI settings — same keys as `apps/web/lib/ui-settings.ts`, stored in
 * AsyncStorage instead of localStorage. Never used for astrology facts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "galaxia.setting.";

/** Constellation orbital guide rings. Stored "true" | "false"; missing → on. */
export const SETTING_SHOW_RINGS = "showRings";

export async function readUiSetting(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export async function writeUiSetting(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, value);
  } catch {
    /* Private mode / quota: the toggle may reset next visit. That is honest. */
  }
}
