import { Stack } from "expo-router";

import { adminTheme } from "@/constants/AdminTheme";

export default function RoadmapLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: adminTheme.text,
        contentStyle: { backgroundColor: adminTheme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Roadmap" }} />
    </Stack>
  );
}
