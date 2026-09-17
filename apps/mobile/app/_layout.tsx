import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { galaxiaFontMap } from "../src/lib/typography";
import { AuthProvider } from "../src/providers/auth-provider";
import { AccessibilityProvider, useAccessibilitySettings } from "../src/providers/accessibility-provider";
import { EntitlementProvider } from "../src/providers/entitlement-provider";

void SplashScreen.preventAutoHideAsync();

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
  const [fontsLoaded, fontError] = useFonts(galaxiaFontMap);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
