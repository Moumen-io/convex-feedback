import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAdminTheme } from "@/constants/AdminTheme";

export default function TabLayout() {
  const theme = useAdminTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      iconColor={{ default: theme.muted, selected: theme.primary }}
      tintColor={theme.primary}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="inbox" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray.full.fill" md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="roadmap" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Roadmap</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
