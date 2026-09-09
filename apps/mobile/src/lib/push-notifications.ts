import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Push token registration for Generational Transit Alerts (Feature 3).
 *
 * UNTESTED ON DEVICE — no iOS/Android simulator is available in this
 * environment (see AGENTS.md's Expo mobile caveat: this VM can boot Metro
 * and typecheck the app, but cannot render or interact with it). This
 * follows Expo's documented `expo-notifications` registration flow, but
 * the actual permission prompt, token round-trip, and received
 * notification have not been exercised against a real device.
 *
 * No-ops (never throws, never blocks app usage) on web, when permission is
 * denied, or when anything about the token fetch fails — push is a
 * best-effort enhancement, not a requirement to use the app.
 */
export async function registerForPushNotificationsAsync(ownerId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== "granted") {
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
      status = requestedStatus;
    }
    if (status !== "granted") return;

    // Real EAS builds need a project id; Expo Go resolves this on its own.
    // `undefined` is a valid, documented argument when no EAS project is
    // configured — never fabricate a value here.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const isPlaceholderProjectId = !projectId || projectId === "replace-with-eas-project-id";
    const tokenResponse = await Notifications.getExpoPushTokenAsync(isPlaceholderProjectId ? undefined : { projectId });
    const token = tokenResponse.data;
    if (!token) return;

    await supabase.from("push_tokens").upsert(
      {
        owner_id: ownerId,
        expo_push_token: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "expo_push_token" }
    );
  } catch {
    // Best-effort — never block app usage on push registration failing.
  }
}
