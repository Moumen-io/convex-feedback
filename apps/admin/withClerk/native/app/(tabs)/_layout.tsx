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
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray.full.fill" md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="roadmap">
        <NativeTabs.Trigger.Label>Roadmap</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tags">
        <NativeTabs.Trigger.Label>Tags</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tag.fill" md="label" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
