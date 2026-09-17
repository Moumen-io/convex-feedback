import { ChevronRight, Monitor, Moon, Sun } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import {
  ADMIN_COLOR_PRESETS,
  createAdminTheme,
  DEFAULT_ADMIN_ACCENT_COLOR,
  type AdminSettingsScreenProps,
  type AdminThemeMode,
} from "../shared";
import { NativeAccentSettings } from "./controls/NativeAccentSettings";
import { useAdminThemeSettings, type AdminScreenTheme } from "./theme";

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
  themeMode: themeModeProp,
  onThemeModeChange,
  accentColor: accentColorProp,
  onAccentColorChange,
  colorPresets = ADMIN_COLOR_PRESETS,
  onManageAccount,
  theme: themeProp,
}: NativeAdminSettingsScreenProps) {
  const themeSettings = useAdminThemeSettings();
  const systemColorScheme = useColorScheme();
  const selectedThemeMode =
    themeModeProp ?? themeSettings?.themeMode ?? "system";
  const selectedAccentColor =
    accentColorProp ?? themeSettings?.accentColor ?? DEFAULT_ADMIN_ACCENT_COLOR;
  const [themeMode, setThemeMode] = useState<AdminThemeMode>(selectedThemeMode);
  const [accentColor, setAccentColor] = useState(selectedAccentColor);

  useEffect(() => setThemeMode(selectedThemeMode), [selectedThemeMode]);
  useEffect(() => setAccentColor(selectedAccentColor), [selectedAccentColor]);

  const fallbackTheme = createAdminTheme(
    accentColor,
    resolveColorScheme(themeMode, systemColorScheme),
  );
  const theme = themeProp ?? themeSettings?.theme ?? fallbackTheme;
  const styles = createStyles(theme);

  const changeThemeMode = (nextMode: AdminThemeMode) => {
    setThemeMode(nextMode);
    if (onThemeModeChange) onThemeModeChange(nextMode);
    else themeSettings?.setThemeMode(nextMode);
  };

  const changeAccentColor = (nextColor: string) => {
    setAccentColor(nextColor);
    if (onAccentColorChange) onAccentColorChange(nextColor);
    else themeSettings?.setAccentColor(nextColor);
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
      <View style={[styles.section, styles.accountSection]}>
        <View style={styles.sectionBody}>
          <Pressable
            accessibilityRole="button"
            onPress={onManageAccount}
            style={({ pressed }) => [
              styles.accountSummary,
              pressed && styles.pressed,
            ]}
          >
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
            <ChevronRight color={theme.mutedText} size={17} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.sectionBody}>
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

          <NativeAccentSettings
            changeAccentColor={changeAccentColor}
            selectedPresetId={selectedPresetId}
            colorPresets={colorPresets}
            theme={theme}
            accentColor={accentColor}
            style={styles.themeOptions}
          />
        </View>
      </View>
    </ScrollView>
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

function resolveColorScheme(
  themeMode: AdminThemeMode,
  systemColorScheme: string | null | undefined,
): "light" | "dark" {
  if (themeMode === "dark") return "dark";
  if (themeMode === "light") return "light";
  return systemColorScheme === "dark" ? "dark" : "light";
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
      gap: 13,
    },
    accountSection: { paddingBottom: 30 },
    sectionBody: { gap: 14 },
    sectionTitle: { color: theme.text, fontSize: 17, fontWeight: "700" },
    settingTitle: { color: theme.text, fontSize: 14, fontWeight: "700" },
    themeOptions: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 24,
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
    accountSummary: {
      alignItems: "center",
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 24,
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
    pressed: { opacity: 0.65 },
  });
}
