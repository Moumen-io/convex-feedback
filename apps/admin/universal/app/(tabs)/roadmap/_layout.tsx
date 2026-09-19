import { RoadmapProvider } from "convex-feedback-ui/native";
import { Stack } from "expo-router";

import {
  useAdminFeedbackHooks,
  useAdminTheme,
} from "convex-feedback-admin-app-screens/native";

export default function RoadmapLayout() {
  const theme = useAdminTheme();
  const hooks = useAdminFeedbackHooks();
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
    <RoadmapProvider hooks={hooks} theme={adminRoadmapTheme}>
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
