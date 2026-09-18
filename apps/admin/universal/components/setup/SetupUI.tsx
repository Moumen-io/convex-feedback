import { Check, ChevronRight, LockKeyhole } from "lucide-react-native";
import type * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useAdminTheme,
  type AdminTheme,
} from "convex-feedback-admin-app-screens/native";

export function createSetupStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { backgroundColor: theme.background, flex: 1 },
    content: { gap: 22, padding: 22, paddingBottom: 34 },
    header: { gap: 8, paddingBottom: 2 },
    logo: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.primary,
      borderRadius: 14,
      height: 44,
      justifyContent: "center",
      marginBottom: 4,
      width: 44,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
    },
    step: {
      color: theme.mutedText,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      marginTop: 5,
    },
    title: {
      color: theme.text,
      fontSize: 27,
      fontWeight: "800",
      lineHeight: 33,
    },
    subtitle: { color: theme.mutedText, fontSize: 13, lineHeight: 20 },
    section: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 13,
      padding: 16,
    },
    sectionHeading: { alignItems: "center", flexDirection: "row", gap: 9 },
    sectionHeadingText: { fontSize: 15, fontWeight: "800" },
    fieldGroup: { gap: 7 },
    label: { color: theme.text, fontSize: 12, fontWeight: "700" },
    input: {
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 13,
      borderWidth: 1,
      color: theme.text,
      fontSize: 14,
      minHeight: 48,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    inputColor: { color: theme.mutedText },
    hint: { color: theme.mutedText, fontSize: 11, lineHeight: 17 },
    namespaceField: {
      alignItems: "center",
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 48,
      paddingLeft: 13,
    },
    namespacePrefix: {
      color: theme.mutedText,
      fontSize: 14,
      fontWeight: "700",
    },
    namespaceInput: {
      color: theme.text,
      flex: 1,
      fontSize: 14,
      minHeight: 46,
      paddingHorizontal: 2,
    },
    connectionAction: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: theme.primary,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      gap: 8,
      minHeight: 42,
      paddingHorizontal: 13,
    },
    connectionActionText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    connectionSuccess: { color: theme.success, fontSize: 11, lineHeight: 17 },
    connectionError: { color: theme.danger, fontSize: 11, lineHeight: 17 },
    optionList: { gap: 9 },
    option: {
      alignItems: "center",
      borderColor: theme.border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      padding: 12,
    },
    optionSelected: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    optionDisabled: { opacity: 0.5 },
    optionCopy: { flex: 1, gap: 4 },
    optionTitle: { color: theme.text, fontSize: 13, fontWeight: "700" },
    optionDescription: { color: theme.mutedText, fontSize: 11, lineHeight: 16 },
    optionMeta: {
      color: theme.mutedText,
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.7,
    },
    radio: {
      alignItems: "center",
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1.5,
      height: 19,
      justifyContent: "center",
      width: 19,
    },
    radioSelected: { borderColor: theme.primary },
    radioDot: {
      backgroundColor: theme.primary,
      borderRadius: 5,
      height: 9,
      width: 9,
    },
    methodRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 11,
      paddingVertical: 4,
    },
    checkbox: {
      alignItems: "center",
      borderColor: theme.border,
      borderRadius: 6,
      borderWidth: 1.5,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    checkboxEnabled: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    methodCopy: { flex: 1, gap: 2 },
    methodLabel: { color: theme.text, fontSize: 13, fontWeight: "700" },
    methodDescription: { color: theme.mutedText, fontSize: 11, lineHeight: 16 },
    subsectionLabel: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "700",
      paddingTop: 3,
    },
    errorBox: {
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.danger,
      borderRadius: 14,
      borderWidth: 1,
      gap: 5,
      padding: 13,
    },
    error: { color: theme.danger, fontSize: 12, lineHeight: 18 },
    footer: { alignItems: "center", flexDirection: "row", gap: 10 },
    secondaryButton: {
      alignItems: "center",
      minHeight: 50,
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    secondaryButtonText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "700",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.primary,
      borderRadius: 14,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: theme.primaryForeground,
      fontSize: 13,
      fontWeight: "700",
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.68 },
    securityNote: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 17,
      textAlign: "center",
    },
  });
}

export function SetupPage({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <LockKeyhole
              color={theme.primaryForeground}
              size={22}
              strokeWidth={2.2}
            />
          </View>
          <Text style={styles.eyebrow}>CONVEX FEEDBACK ADMIN</Text>
          <Text style={styles.step}>STEP {step} OF 4</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
        {footer}
        <Text style={styles.securityNote}>
          Configuration is encrypted with expo-secure-store. Server-side secrets
          are never requested or stored.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function SetupSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        {icon}
        <Text style={[styles.sectionHeadingText, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function SetupField({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.mutedText}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function SetupOption({
  label,
  description,
  selected,
  disabled,
  meta,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  meta?: string;
  onPress: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        disabled && styles.optionDisabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionCopy}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 7 }}>
          <Text style={styles.optionTitle}>{label}</Text>
          {meta && <Text style={styles.optionMeta}>{meta}</Text>}
        </View>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <ChevronRight
        color={selected ? theme.primary : theme.mutedText}
        size={17}
      />
    </Pressable>
  );
}

export function SetupMethodToggle({
  label,
  description,
  enabled,
  onPress,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: enabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.methodRow, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, enabled && styles.checkboxEnabled]}>
        {enabled && <Check color="#FFFFFF" size={14} strokeWidth={2.6} />}
      </View>
      <View style={styles.methodCopy}>
        <Text style={styles.methodLabel}>{label}</Text>
        <Text style={styles.methodDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

export function SetupIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <View style={styles.errorBox}>
      {issues.map((issue) => (
        <Text key={issue} style={styles.error}>
          • {issue}
        </Text>
      ))}
    </View>
  );
}

export function SetupFooter({
  nextLabel,
  onNext,
  nextIcon,
  onCancel,
  disabled,
}: {
  nextLabel: string;
  onNext: () => void;
  nextIcon?: React.ReactNode;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  return (
    <View style={styles.footer}>
      {onCancel && (
        <Pressable
          disabled={disabled}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onNext}
        style={({ pressed }) => [
          styles.primaryButton,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {nextIcon}
        <Text style={styles.primaryButtonText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}
