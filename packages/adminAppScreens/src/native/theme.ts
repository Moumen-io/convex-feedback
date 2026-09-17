import { useColorScheme } from "react-native";

export interface AdminScreenTheme {
  primary: string;
  primaryForeground: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  mutedText: string;
  border: string;
  danger: string;
}

const lightTheme: AdminScreenTheme = {
  primary: "#2563EB",
  primaryForeground: "#FFFFFF",
  background: "#F7F9FF",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF0FF",
  text: "#141A2E",
  mutedText: "#65708A",
  border: "#D8E0F2",
  danger: "#C83B59",
};

const darkTheme: AdminScreenTheme = {
  primary: "#79A1FF",
  primaryForeground: "#09142C",
  background: "#0B1224",
  surface: "#111B34",
  surfaceMuted: "#23284B",
  text: "#EEF3FF",
  mutedText: "#A3B1CF",
  border: "#2D3C61",
  danger: "#FF8EAB",
};

export function useAdminScreenTheme(): AdminScreenTheme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}
