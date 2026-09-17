import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/providers/auth-provider";
import { AccessibilityProvider, useAccessibilitySettings } from "../src/providers/accessibility-provider";
import { EntitlementProvider } from "../src/providers/entitlement-provider";

function AppNavigator() {
  const { reduceMotion } = useAccessibilitySettings();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? "none" : "fade"
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AccessibilityProvider>
        <AuthProvider>
          <EntitlementProvider>
            <SafeAreaProvider>
              <AppNavigator />
            </SafeAreaProvider>
          </EntitlementProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </GestureHandlerRootView>
  );
}
