import { Stack } from "expo-router";

import { useAdminTheme } from "@/constants/AdminTheme";

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
