import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function TabLayout() {
  const theme = useAdminTheme();
  return (
    <NativeTabs
      backgroundColor={theme.surface}
      iconColor={{ default: theme.muted, selected: theme.primary }}
      tintColor={theme.primary}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger
        accessibilityLabel="Inbox"
        name="inbox"
        disableAutomaticContentInsets
      >
        <NativeTabs.Trigger.Label hidden>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray.full.fill" md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        accessibilityLabel="Roadmap"
        name="roadmap"
        disableAutomaticContentInsets
      >
        <NativeTabs.Trigger.Label hidden>Roadmap</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        accessibilityLabel="Settings"
        name="settings"
        role="search"
        disableAutomaticContentInsets
        listeners={{
          tabPress: (e) => {
            console.log(e);
          },
        }}
      >
        <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
