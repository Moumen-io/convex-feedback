import type { FeedbackColors } from "convex-feedback-ui";
import { useColorScheme } from "react-native";

export type AdminTheme = FeedbackColors & {
  /** Legacy alias used by the admin-only screens. */
  muted: string;
  /** Legacy alias used by compact selected-state surfaces. */
  primarySoft: string;
  warning: string;
};

function createAdminTheme(
  colors: FeedbackColors & { warning: string },
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

export function useAdminTheme(): AdminTheme {
  return useColorScheme() === "dark" ? darkAdminTheme : lightAdminTheme;
}
