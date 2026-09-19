import { Stack } from "expo-router";

import { RoadmapProvider } from "convex-feedback-ui/native";

import { useAdminTheme } from "@/constants/AdminTheme";
import { feedbackHooks } from "@/lib/feedback";

export default function RoadmapLayout() {
  const theme = useAdminTheme();
  const adminRoadmapTheme = {
    colors: {
      primary: theme.primary,
      primaryForeground: theme.primaryForeground,
      background: theme.background,
      surface: theme.surface,
      input: theme.input,
      surfaceMuted: theme.surfaceMuted,
      text: theme.text,
      mutedText: theme.mutedText,
      border: theme.border,
      danger: theme.danger,
      success: theme.success,
    },
  };

  return (
    <RoadmapProvider hooks={feedbackHooks} theme={adminRoadmapTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Roadmap" }} />
      </Stack>
    </RoadmapProvider>
  );
}
