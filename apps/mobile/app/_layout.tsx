import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/providers/auth-provider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade"
          }}
        />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
