/** Per-device dismiss flags for chart discovery hints (wheel + flip cards). */

export const WHEEL_EXPLORE_HINT_KEY = "galaxia.wheel-explore-hint.dismissed";
export const FLIP_CARD_HINT_KEY = "galaxia.flip-card-hint.dismissed";

export function readWheelExploreHintDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WHEEL_EXPLORE_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissWheelExploreHint(): void {
  try {
    window.localStorage.setItem(WHEEL_EXPLORE_HINT_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function readFlipCardHintDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLIP_CARD_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissFlipCardHint(): void {
  try {
    window.localStorage.setItem(FLIP_CARD_HINT_KEY, "1");
  } catch {
    /* private mode */
  }
}
