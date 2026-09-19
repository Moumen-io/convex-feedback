import { Stack } from "expo-router";

import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function SettingsLayout() {
  const theme = useAdminTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}
