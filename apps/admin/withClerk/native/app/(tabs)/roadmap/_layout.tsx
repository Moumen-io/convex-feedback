import { Stack } from "expo-router";

import { RoadmapProvider } from "convex-feedback-ui/native";

import { adminTheme } from "@/constants/AdminTheme";
import { feedbackHooks } from "@/lib/feedback";

const adminRoadmapTheme = {
  colors: {
    primary: adminTheme.primary,
    background: adminTheme.background,
    surface: adminTheme.surface,
    surfaceMuted: adminTheme.surface,
    text: adminTheme.text,
    mutedText: adminTheme.muted,
    border: adminTheme.border,
    danger: adminTheme.danger,
  },
} as const;

export default function RoadmapLayout() {
  return (
    <RoadmapProvider hooks={feedbackHooks} theme={adminRoadmapTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: adminTheme.text,
          contentStyle: { backgroundColor: adminTheme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Roadmap" }} />
      </Stack>
    </RoadmapProvider>
  );
}
