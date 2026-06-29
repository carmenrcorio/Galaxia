import type { PropsWithChildren } from "react";
import { AccessibilityInfo } from "react-native";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface AccessibilityContextValue {
  reduceMotion: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  const value = useMemo(() => ({ reduceMotion }), [reduceMotion]);
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilitySettings() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibilitySettings must be used within AccessibilityProvider");
  return context;
}
