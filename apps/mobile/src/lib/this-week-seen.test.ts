import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    getAllKeys: async () => [...store.keys()],
    multiRemove: async (keys: string[]) => {
      for (const key of keys) store.delete(key);
    },
  },
}));

import { clearShownSharedTransits, THIS_WEEK_SEEN_KEY_PREFIX } from "./this-week-seen";

beforeEach(() => {
  store.clear();
});

describe("clearShownSharedTransits", () => {
  it("removes the this-week-seen keys from AsyncStorage and leaves other keys", async () => {
    store.set(`${THIS_WEEK_SEEN_KEY_PREFIX}owner-a`, "[]");
    store.set("sb-auth-token", "session");
    await clearShownSharedTransits();
    expect(store.has(`${THIS_WEEK_SEEN_KEY_PREFIX}owner-a`)).toBe(false);
    expect(store.get("sb-auth-token")).toBe("session");
  });
});
