import { NativeTabs } from "expo-router/unstable-native-tabs";

import { adminTheme } from "@/constants/AdminTheme";

export default function TabLayout() {
  return (
    <NativeTabs
      backgroundColor={adminTheme.surface}
      iconColor={{ default: adminTheme.muted, selected: adminTheme.primary }}
      tintColor={adminTheme.primary}
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
