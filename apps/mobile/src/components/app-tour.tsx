import { APP_TOUR_COPY } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../lib/typography";

export function AppTour({
  visible,
  onSeen,
}: {
  visible: boolean;
  onSeen: () => Promise<void>;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [settling, setSettling] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const step = APP_TOUR_COPY.steps[stepIndex];
  const finalStep = stepIndex === APP_TOUR_COPY.steps.length - 1;

  async function settle() {
    if (settling) return;
    setSettling(true);
    setSaveError(false);
    try {
      await onSeen();
    } catch {
      setSaveError(true);
      setSettling(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => void settle()}
    >
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(7,4,17,0.82)",
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            top: Math.max(insets.top + 24, 52),
            alignSelf: "center",
            width: Math.min(width - 48, 330),
            height: Math.min(width - 48, 260),
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(230,174,108,0.72)",
            backgroundColor: "rgba(230,174,108,0.035)",
            shadowColor: tokens.colors.gold,
            shadowOpacity: 0.3,
            shadowRadius: 24,
          }}
        />
        <View
          accessibilityRole="summary"
          style={{
            paddingHorizontal: 22,
            paddingTop: 22,
            paddingBottom: Math.max(insets.bottom + 18, 30),
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: "rgba(230,174,108,0.28)",
            backgroundColor: "rgba(25,18,45,0.97)",
            gap: 14,
          }}
        >
          <View
            accessibilityLabel={`Step ${stepIndex + 1} of ${APP_TOUR_COPY.steps.length}`}
            style={{ flexDirection: "row", gap: 7 }}
          >
            {APP_TOUR_COPY.steps.map((item, index) => (
              <View
                key={item.title}
                style={{
                  width: index === stepIndex ? 24 : 7,
                  height: 7,
                  borderRadius: 99,
                  backgroundColor:
                    index <= stepIndex
                      ? tokens.colors.gold
                      : "rgba(183,154,216,0.28)",
                }}
              />
            ))}
          </View>
          <Text
            accessibilityRole="header"
            style={{
              color: tokens.colors.cream,
              fontFamily: fonts.frauncesSemi,
              fontSize: 25,
            }}
          >
            {step.title}
          </Text>
          <Text
            style={{
              color: tokens.colors.mist,
              fontFamily: fonts.inter,
              fontSize: 15,
              lineHeight: 23,
            }}
          >
            {step.body}
          </Text>
          {"secondary" in step && step.secondary ? (
            <Text
              style={{
                color: tokens.colors.goldSoft,
                fontFamily: fonts.inter,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {step.secondary}
            </Text>
          ) : null}
          {saveError ? (
            <Text
              accessibilityRole="alert"
              style={{ color: tokens.colors.rose, fontFamily: fonts.inter }}
            >
              {APP_TOUR_COPY.saveError}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={APP_TOUR_COPY.skip}
              disabled={settling}
              onPress={() => void settle()}
              hitSlop={10}
              style={{ paddingVertical: 12, paddingRight: 16 }}
            >
              <Text
                style={{
                  color: tokens.colors.mist,
                  fontFamily: fonts.interSemi,
                  textDecorationLine: "underline",
                }}
              >
                {APP_TOUR_COPY.skip}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                finalStep ? APP_TOUR_COPY.finish : APP_TOUR_COPY.next
              }
              disabled={settling}
              onPress={() => {
                if (finalStep) {
                  void settle();
                } else {
                  setSaveError(false);
                  setStepIndex((current) => current + 1);
                }
              }}
              style={{
                minHeight: 44,
                justifyContent: "center",
                borderRadius: 999,
                paddingHorizontal: 22,
                backgroundColor: tokens.colors.gold,
                opacity: settling ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: tokens.colors.ink,
                  fontFamily: fonts.interSemi,
                }}
              >
                {finalStep ? APP_TOUR_COPY.finish : APP_TOUR_COPY.next}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
