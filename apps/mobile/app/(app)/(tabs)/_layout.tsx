import { tokens } from "@galaxia/ui";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { fonts } from "../../../src/lib/typography";
import { useAccessibilitySettings } from "../../../src/providers/accessibility-provider";

function TabMark({ color }: { color: string }) {
  return (
    <Text style={{ color, fontFamily: fonts.fraunces, fontSize: 15, lineHeight: 18 }}>✦</Text>
  );
}

export const unstable_settings = {
  initialRouteName: "home"
};

/**
 * Product tabs: Home, Compare, Groups, Vela, Settings.
 * Moment / add-person / profile stay stack screens above this group.
 * Transparent scenes so the authed CosmicBackground shows through glass.
 */
export default function AuthedTabsLayout() {
  const { reduceMotion } = useAccessibilitySettings();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? "none" : "fade",
        sceneStyle: { backgroundColor: "transparent" },
        tabBarActiveTintColor: tokens.colors.gold,
        tabBarInactiveTintColor: tokens.colors.mist2,
        tabBarLabelStyle: { fontFamily: fonts.interSemi, fontSize: 11, letterSpacing: 0.2 },
        tabBarIcon: ({ color }) => <TabMark color={color} />,
        tabBarBackground: () => <BlurView tint="dark" intensity={48} style={StyleSheet.absoluteFill} />,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "rgba(10,7,23,0.42)",
          borderTopColor: "rgba(230,174,108,0.13)",
          borderTopWidth: StyleSheet.hairlineWidth
        }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="compare" options={{ title: "Compare" }} />
      <Tabs.Screen name="groups" options={{ title: "Groups" }} />
      <Tabs.Screen name="vela" options={{ title: "Vela" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
