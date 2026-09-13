import { Stack } from "expo-router";

import { adminTheme } from "@/constants/AdminTheme";

export default function InboxLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: adminTheme.text,
        contentStyle: { backgroundColor: adminTheme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Inbox" }} />
    </Stack>
  );
}
