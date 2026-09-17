import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AdminThemeProvider } from "./theme.js";

export function NativeAppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <AdminThemeProvider>{children}</AdminThemeProvider>
    </SafeAreaProvider>
  );
}
