import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

export interface AdminTheme {
  primary: string;
  primaryForeground: string;
  background: string;
  surface: string;
  input: string;
  surfaceMuted: string;
  text: string;
  mutedText: string;
  muted: string;
  primarySoft: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
}

export type AdminScreenTheme = AdminTheme;

function createAdminTheme(
  colors: Omit<AdminTheme, "muted" | "primarySoft">,
): AdminTheme {
  return {
    ...colors,
    muted: colors.mutedText,
    primarySoft: colors.surfaceMuted,
  };
}

export const lightAdminTheme = createAdminTheme({
  primary: "#2563EB",
  primaryForeground: "#FFFFFF",
  background: "#F7F9FF",
  surface: "#FFFFFF",
  input: "#F1F5FF",
  surfaceMuted: "#EEF0FF",
  text: "#141A2E",
  mutedText: "#65708A",
  border: "#D8E0F2",
  danger: "#C83B59",
  success: "#1D9B72",
  warning: "#F5A623",
});

export const darkAdminTheme = createAdminTheme({
  primary: "#79A1FF",
  primaryForeground: "#09142C",
  background: "#0B1224",
  surface: "#111B34",
  input: "#182544",
  surfaceMuted: "#23284B",
  text: "#EEF3FF",
  mutedText: "#A3B1CF",
  border: "#2D3C61",
  danger: "#FF8EAB",
  success: "#71D5B0",
  warning: "#FFB869",
});

const AdminThemeContext = createContext<AdminTheme | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = useMemo(
    () => (colorScheme === "dark" ? darkAdminTheme : lightAdminTheme),
    [colorScheme],
  );

  return (
    <AdminThemeContext.Provider value={theme}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminTheme {
  const providedTheme = useContext(AdminThemeContext);
  if (providedTheme) return providedTheme;
  return useColorScheme() === "dark" ? darkAdminTheme : lightAdminTheme;
}

export function useAdminScreenTheme(): AdminScreenTheme {
  return useAdminTheme();
}
