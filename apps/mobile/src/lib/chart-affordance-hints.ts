import { readUiSetting, writeUiSetting } from "./ui-settings";

export const WHEEL_EXPLORE_HINT_KEY = "wheel-explore-hint.dismissed";
export const FLIP_CARD_HINT_KEY = "flip-card-hint.dismissed";

export async function readWheelExploreHintDismissed(): Promise<boolean> {
  return (await readUiSetting(WHEEL_EXPLORE_HINT_KEY)) === "1";
}

export async function dismissWheelExploreHint(): Promise<void> {
  await writeUiSetting(WHEEL_EXPLORE_HINT_KEY, "1");
}

export async function readFlipCardHintDismissed(): Promise<boolean> {
  return (await readUiSetting(FLIP_CARD_HINT_KEY)) === "1";
}

export async function dismissFlipCardHint(): Promise<void> {
  await writeUiSetting(FLIP_CARD_HINT_KEY, "1");
}
