import {
  Check,
  ChevronRight,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
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
  TextInput,
  View,
} from "react-native";

import {
  ADMIN_COLOR_PRESETS,
  type AdminColorPreset,
  type AdminSettingsScreenProps,
  type AdminThemeMode,
} from "../shared/index.js";
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
  const [customColor, setCustomColor] = useState(accentColorProp);

  useEffect(() => {
    setThemeMode(themeModeProp);
  }, [themeModeProp]);

  useEffect(() => {
    setAccentColor(accentColorProp);
    setCustomColor(accentColorProp);
  }, [accentColorProp]);

  const changeThemeMode = (nextMode: AdminThemeMode) => {
    setThemeMode(nextMode);
    onThemeModeChange?.(nextMode);
  };

  const changeAccentColor = (nextColor: string) => {
    setAccentColor(nextColor);
    setCustomColor(nextColor);
    onAccentColorChange?.(nextColor);
  };

  const accountName = account?.name ?? "Admin account";
  const accountEmail = account?.email ?? "Signed-in account";
  const accountInitials = getInitials(accountName, accountEmail);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>WORKSPACE PREFERENCES</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Tune the way your feedback workspace looks, then manage the account
            that has access to it.
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Palette color={theme.primary} size={22} strokeWidth={1.8} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionIntro
          eyebrow="APPEARANCE"
          title="Make it yours"
          description="Small visual choices make a busy admin surface easier to scan."
          theme={theme}
        />
        <View style={styles.sectionBody}>
          <SettingLabel
            title="Theme"
            description="Choose the surface that feels right for this workspace."
            theme={theme}
          />
          <View style={styles.themeOptions}>
            {themeOptions.map(({ value, label, Icon }) => {
              const selected = themeMode === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
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

          <SettingLabel
            title="Accent color"
            description="Use one clear color to keep active states easy to find."
            theme={theme}
          />
          <View style={styles.colorGrid}>
            {colorPresets.map((preset) => (
              <ColorPresetButton
                key={preset.id}
                preset={preset}
                selected={
                  accentColor.toLowerCase() === preset.value.toLowerCase()
                }
                theme={theme}
                onSelect={() => changeAccentColor(preset.value)}
              />
            ))}
          </View>

          <View style={styles.customColorRow}>
            <View
              style={[
                styles.customSwatch,
                {
                  backgroundColor: isHexColor(customColor)
                    ? customColor
                    : theme.primary,
                },
              ]}
            />
            <View style={styles.customColorCopy}>
              <Text style={styles.customColorTitle}>Custom color</Text>
              <Text style={styles.customColorDescription}>
                Enter a six-digit hex value to preview it.
              </Text>
            </View>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              onChangeText={(value) => {
                const nextValue = value.toUpperCase();
                setCustomColor(nextValue);
                if (isHexColor(nextValue)) changeAccentColor(nextValue);
              }}
              placeholder="#2563EB"
              placeholderTextColor={theme.mutedText}
              style={styles.colorInput}
              value={customColor}
            />
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.accountSection]}>
        <SectionIntro
          eyebrow="ACCOUNT"
          title="Access and security"
          description="Keep your profile current and control how you leave the workspace."
          theme={theme}
        />
        <View style={styles.sectionBody}>
          <View style={styles.accountSummary}>
            {account?.imageUrl ? (
              <Image source={{ uri: account.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{accountInitials}</Text>
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
            <View style={styles.adminBadge}>
              <ShieldCheck color={theme.primary} size={13} />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          </View>

          <ActionRow
            Icon={UserRound}
            title="Manage account"
            description="Profile details, sign-in methods, and security settings"
            theme={theme}
            onPress={onManageAccount}
          />
          <ActionRow
            Icon={KeyRound}
            title="Security"
            description="Manage passwords and multi-factor authentication"
            theme={theme}
            onPress={onManageAccount}
          />
          <ActionRow
            Icon={LogOut}
            title="Sign out"
            description="End this admin session on the current device"
            destructive
            theme={theme}
            onPress={onSignOut}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>
          Changes are ready to apply across this admin app.
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  theme,
}: {
  eyebrow: string;
  title: string;
  description: string;
  theme: AdminScreenTheme;
}) {
  const styles = createStyles(theme);

  return (
    <View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

function SettingLabel({
  title,
  description,
  theme,
}: {
  title: string;
  description: string;
  theme: AdminScreenTheme;
}) {
  const styles = createStyles(theme);

  return (
    <View style={styles.settingLabel}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
  );
}

function ColorPresetButton({
  preset,
  selected,
  theme,
  onSelect,
}: {
  preset: AdminColorPreset;
  selected: boolean;
  theme: AdminScreenTheme;
  onSelect: () => void;
}) {
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityLabel={`${preset.label}: ${preset.description}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.colorPreset,
        selected && styles.colorPresetSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.colorSwatch, { backgroundColor: preset.value }]}>
        {selected && <Check color="#FFFFFF" size={13} strokeWidth={3} />}
      </View>
      <Text style={styles.colorPresetLabel}>{preset.label}</Text>
    </Pressable>
  );
}

function ActionRow({
  Icon,
  title,
  description,
  destructive = false,
  theme,
  onPress,
}: {
  Icon: typeof UserRound;
  title: string;
  description: string;
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
        destructive ? styles.actionRowDestructive : null,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          destructive ? styles.actionIconDestructive : null,
        ]}
      >
        <Icon
          color={destructive ? theme.danger : theme.mutedText}
          size={17}
          strokeWidth={1.8}
        />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, destructive && styles.dangerText]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.actionDescription}>
          {description}
        </Text>
      </View>
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
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingTop: 24,
      paddingBottom: 24,
    },
    headerCopy: { flex: 1 },
    eyebrow: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
    title: {
      color: theme.text,
      fontSize: 32,
      fontWeight: "700",
      letterSpacing: -1,
      marginTop: 8,
    },
    subtitle: {
      maxWidth: 430,
      color: theme.mutedText,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 10,
    },
    headerIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: theme.surfaceMuted,
    },
    section: {
      gap: 24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingVertical: 28,
    },
    accountSection: { paddingBottom: 30 },
    sectionBody: { gap: 16 },
    sectionTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "700",
      marginTop: 6,
    },
    sectionDescription: {
      color: theme.mutedText,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
    settingLabel: { gap: 4 },
    settingTitle: { color: theme.text, fontSize: 14, fontWeight: "700" },
    settingDescription: {
      color: theme.mutedText,
      fontSize: 12,
      lineHeight: 18,
    },
    themeOptions: {
      flexDirection: "row",
      gap: 8,
      borderRadius: 16,
      backgroundColor: theme.surfaceMuted,
      padding: 5,
    },
    themeOption: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    themeOptionSelected: {
      backgroundColor: theme.surface,
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    themeOptionLabel: {
      color: theme.mutedText,
      fontSize: 12,
      fontWeight: "600",
    },
    themeOptionLabelSelected: { color: theme.text },
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    colorPreset: {
      flexGrow: 1,
      flexBasis: "28%",
      alignItems: "center",
      gap: 8,
      minWidth: 74,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surface,
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    colorPresetSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.surfaceMuted,
    },
    colorSwatch: {
      alignItems: "center",
      justifyContent: "center",
      width: 27,
      height: 27,
      borderRadius: 14,
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    colorPresetLabel: { color: theme.text, fontSize: 11, fontWeight: "600" },
    customColorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      backgroundColor: theme.surfaceMuted,
      padding: 11,
    },
    customSwatch: {
      width: 34,
      height: 34,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: "#0000001A",
    },
    customColorCopy: { flex: 1, gap: 2 },
    customColorTitle: { color: theme.text, fontSize: 12, fontWeight: "700" },
    customColorDescription: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 16,
    },
    colorInput: {
      width: 84,
      height: 36,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 9,
      backgroundColor: theme.surface,
      color: theme.text,
      fontFamily: "monospace",
      fontSize: 11,
      paddingHorizontal: 9,
      textAlign: "center",
    },
    accountSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.surfaceMuted,
      padding: 13,
    },
    avatar: { width: 43, height: 43, borderRadius: 22 },
    avatarFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    avatarText: {
      color: theme.primaryForeground,
      fontSize: 13,
      fontWeight: "700",
    },
    accountCopy: { flex: 1, gap: 3 },
    accountName: { color: theme.text, fontSize: 13, fontWeight: "700" },
    accountEmail: { color: theme.mutedText, fontSize: 11 },
    adminBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      backgroundColor: theme.surface,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    adminBadgeText: { color: theme.primary, fontSize: 10, fontWeight: "700" },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.surface,
      padding: 13,
    },
    actionRowDestructive: { borderColor: `${theme.danger}55` },
    actionIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 35,
      height: 35,
      borderRadius: 11,
      backgroundColor: theme.surfaceMuted,
    },
    actionIconDestructive: { backgroundColor: `${theme.danger}18` },
    actionCopy: { flex: 1, gap: 3 },
    actionTitle: { color: theme.text, fontSize: 13, fontWeight: "700" },
    dangerText: { color: theme.danger },
    actionDescription: { color: theme.mutedText, fontSize: 11, lineHeight: 16 },
    pressed: { opacity: 0.65 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingTop: 18,
    },
    footerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    footerText: { color: theme.mutedText, fontSize: 11 },
  });
}
