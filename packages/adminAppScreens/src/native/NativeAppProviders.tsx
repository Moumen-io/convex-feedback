import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AdminThemeProvider, type AdminThemeProviderProps } from "./theme.js";

export type NativeAppProvidersProps = Omit<
  AdminThemeProviderProps,
  "children"
> & {
  children: ReactNode;
};

export function NativeAppProviders({
  children,
  ...themeProps
}: NativeAppProvidersProps) {
  return (
    <SafeAreaProvider>
      <AdminThemeProvider {...themeProps}>{children}</AdminThemeProvider>
    </SafeAreaProvider>
  );
}
