import { Host, Picker } from "@expo/ui";
import {
  ChevronRight,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ADMIN_COLOR_PRESETS,
  type AdminSettingsScreenProps,
  type AdminThemeMode,
} from "../shared/index.js";
import { NativeAccentColorPicker } from "./controls/NativeAccentColorPicker";
import { useAdminScreenTheme, type AdminScreenTheme } from "./theme.js";

const themeOptions: {
  value: AdminThemeMode;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

export interface NativeAdminSettingsScreenProps extends AdminSettingsScreenProps {
  theme?: AdminScreenTheme;
}

export function AdminSettingsScreen({
  account,
  themeMode: themeModeProp = "system",
  onThemeModeChange,
  accentColor: accentColorProp = ADMIN_COLOR_PRESETS[0].value,
  onAccentColorChange,
  colorPresets = ADMIN_COLOR_PRESETS,
  onManageAccount,
  onSignOut,
  theme: themeProp,
}: NativeAdminSettingsScreenProps) {
  const systemTheme = useAdminScreenTheme();
  const theme = themeProp ?? systemTheme;
  const styles = createStyles(theme);
  const [themeMode, setThemeMode] = useState<AdminThemeMode>(themeModeProp);
  const [accentColor, setAccentColor] = useState(accentColorProp);

  useEffect(() => setThemeMode(themeModeProp), [themeModeProp]);
  useEffect(() => setAccentColor(accentColorProp), [accentColorProp]);

  const changeThemeMode = (nextMode: AdminThemeMode) => {
    setThemeMode(nextMode);
    onThemeModeChange?.(nextMode);
  };

  const changeAccentColor = (nextColor: string) => {
    setAccentColor(nextColor);
    onAccentColorChange?.(nextColor);
  };

  const selectedPreset = colorPresets.find(
    (preset) => preset.value.toLowerCase() === accentColor.toLowerCase(),
  );
  const selectedPresetId = selectedPreset?.id ?? "custom";
  const accountName = account?.name ?? "Admin account";
  const accountEmail = account?.email ?? "Signed-in account";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.sectionBody}>
          <Text style={styles.settingTitle}>Theme</Text>
          <View style={styles.themeOptions}>
            {themeOptions.map(({ value, label, Icon }) => {
              const selected = themeMode === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={value}
                  onPress={() => changeThemeMode(value)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    selected && styles.themeOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon
                    color={selected ? theme.primary : theme.mutedText}
                    size={17}
                    strokeWidth={1.8}
                  />
                  <Text
                    style={[
                      styles.themeOptionLabel,
                      selected && styles.themeOptionLabelSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.settingTitle}>Accent color</Text>
          <Host style={styles.pickerHost}>
            <Picker
              appearance="menu"
              onValueChange={(value) => {
                const preset = colorPresets.find(
                  (candidate) => candidate.id === value,
                );
                if (preset) changeAccentColor(preset.value);
              }}
              selectedValue={selectedPresetId}
            >
              {colorPresets.map((preset) => (
                <Picker.Item
                  key={preset.id}
                  label={preset.label}
                  value={preset.id}
                />
              ))}
              <Picker.Item label="Custom" value="custom" />
            </Picker>
          </Host>
          <View style={styles.customColorRow}>
            <View
              style={[styles.customSwatch, { backgroundColor: accentColor }]}
            />
            <NativeAccentColorPicker
              onChange={changeAccentColor}
              value={isHexColor(accentColor) ? accentColor : "#2563EB"}
            />
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.accountSection]}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionBody}>
          <View style={styles.accountSummary}>
            {account?.imageUrl ? (
              <Image source={{ uri: account.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {getInitials(accountName, accountEmail)}
                </Text>
              </View>
            )}
            <View style={styles.accountCopy}>
              <Text numberOfLines={1} style={styles.accountName}>
                {accountName}
              </Text>
              <Text numberOfLines={1} style={styles.accountEmail}>
                {accountEmail}
              </Text>
            </View>
          </View>

          <ActionRow
            Icon={UserRound}
            onPress={onManageAccount}
            theme={theme}
            title="Manage account"
          />
          <ActionRow
            Icon={KeyRound}
            onPress={onManageAccount}
            theme={theme}
            title="Manage security"
          />
          <ActionRow
            Icon={LogOut}
            destructive
            onPress={onSignOut}
            theme={theme}
            title="Sign out"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function ActionRow({
  Icon,
  title,
  destructive = false,
  theme,
  onPress,
}: {
  Icon: typeof UserRound;
  title: string;
  destructive?: boolean;
  theme: AdminScreenTheme;
  onPress?: () => void;
}) {
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        destructive && styles.actionRowDestructive,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.actionIcon, destructive && styles.actionIconDestructive]}
      >
        <Icon
          color={destructive ? theme.danger : theme.mutedText}
          size={17}
          strokeWidth={1.8}
        />
      </View>
      <Text style={[styles.actionTitle, destructive && styles.dangerText]}>
        {title}
      </Text>
      <ChevronRight
        color={destructive ? theme.danger : theme.mutedText}
        size={17}
        strokeWidth={1.8}
      />
    </Pressable>
  );
}

function getInitials(name: string, email: string): string {
  const source = name === "Admin account" ? email : name;
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "A";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function createStyles(theme: AdminScreenTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    header: {
      borderBottomColor: theme.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingTop: 24,
      paddingBottom: 24,
    },
    title: {
      color: theme.text,
      fontSize: 32,
      fontWeight: "700",
      letterSpacing: -1,
    },
    section: {
      borderBottomColor: theme.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: 28,
    },
    accountSection: { paddingBottom: 30 },
    sectionBody: { gap: 14 },
    sectionTitle: { color: theme.text, fontSize: 17, fontWeight: "700" },
    settingTitle: { color: theme.text, fontSize: 14, fontWeight: "700" },
    themeOptions: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 16,
      flexDirection: "row",
      gap: 8,
      padding: 5,
    },
    themeOption: {
      alignItems: "center",
      borderRadius: 12,
      flex: 1,
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    themeOptionSelected: {
      backgroundColor: theme.surface,
      elevation: 2,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    themeOptionLabel: {
      color: theme.mutedText,
      fontSize: 12,
      fontWeight: "600",
    },
    themeOptionLabelSelected: { color: theme.text },
    pickerHost: { minHeight: 44, width: "100%" },
    customColorRow: {
      alignItems: "center",
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 10,
    },
    customSwatch: {
      borderColor: "#0000001A",
      borderRadius: 11,
      borderWidth: 1,
      height: 34,
      width: 34,
    },
    accountSummary: {
      alignItems: "center",
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      padding: 13,
    },
    avatar: { borderRadius: 22, height: 43, width: 43 },
    avatarFallback: {
      alignItems: "center",
      backgroundColor: theme.primary,
      justifyContent: "center",
    },
    avatarText: {
      color: theme.primaryForeground,
      fontSize: 13,
      fontWeight: "700",
    },
    accountCopy: { flex: 1, gap: 3 },
    accountName: { color: theme.text, fontSize: 13, fontWeight: "700" },
    accountEmail: { color: theme.mutedText, fontSize: 11 },
    actionRow: {
      alignItems: "center",
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      padding: 13,
    },
    actionRowDestructive: { borderColor: `${theme.danger}55` },
    actionIcon: {
      alignItems: "center",
      backgroundColor: theme.surfaceMuted,
      borderRadius: 11,
      height: 35,
      justifyContent: "center",
      width: 35,
    },
    actionIconDestructive: { backgroundColor: `${theme.danger}18` },
    actionTitle: {
      color: theme.text,
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
    },
    dangerText: { color: theme.danger },
    pressed: { opacity: 0.65 },
  });
}
