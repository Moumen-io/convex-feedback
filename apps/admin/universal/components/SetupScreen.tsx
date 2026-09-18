import {
  ADMIN_AUTH_PROVIDERS,
  DEFAULT_SSO_METHODS,
  normalizeApiNamespace,
  validateAdminProjectConfig,
} from "convex-feedback-admin-auth";
import type {
  AdminAuthMethods,
  AdminProjectConfig,
  AdminSsoMethod,
} from "convex-feedback-admin-auth";
import {
  Check,
  ChevronRight,
  LockKeyhole,
  Plus,
  Server,
  ShieldCheck,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import {
  ActivityIndicator,
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

type SupportedProvider = "convex-auth" | "clerk";

export interface SetupScreenProps {
  initialProject?: AdminProjectConfig;
  onSave: (project: AdminProjectConfig) => Promise<void> | void;
  onCancel?: () => void;
}

export function SetupScreen({
  initialProject,
  onSave,
  onCancel,
}: SetupScreenProps) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const [provider, setProvider] = useState<SupportedProvider>(
    getInitialProvider(initialProject),
  );
  const [name, setName] = useState(initialProject?.name ?? "");
  const [convexUrl, setConvexUrl] = useState(initialProject?.convexUrl ?? "");
  const [apiNamespace, setApiNamespace] = useState(
    initialProject?.apiNamespace ?? "",
  );
  const [publishableKey, setPublishableKey] = useState(
    initialProject?.auth.provider === "clerk"
      ? initialProject.auth.publicConfig.publishableKey
      : "",
  );
  const [methods, setMethods] = useState<AdminAuthMethods>(() =>
    initialProject ? getInitialMethods(initialProject) : { password: true },
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialProject) return;
    setProvider(getInitialProvider(initialProject));
    setName(initialProject.name);
    setConvexUrl(initialProject.convexUrl);
    setApiNamespace(initialProject.apiNamespace);
    setPublishableKey(
      initialProject.auth.provider === "clerk"
        ? initialProject.auth.publicConfig.publishableKey
        : "",
    );
    setMethods(getInitialMethods(initialProject));
  }, [initialProject]);

  const ssoMethods = useMemo(() => methods.sso ?? [], [methods.sso]);

  const toggleMethod = (key: "password" | "emailCode") => {
    setMethods((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleSso = (method: AdminSsoMethod) => {
    setMethods((current) => {
      const currentSso = current.sso ?? [];
      const exists = currentSso.some((entry) => entry.id === method.id);
      return {
        ...current,
        sso: exists
          ? currentSso.filter((entry) => entry.id !== method.id)
          : [...currentSso, method],
      };
    });
  };

  const save = async () => {
    const project: AdminProjectConfig = {
      id: initialProject?.id ?? `project-${Date.now().toString(36)}`,
      name,
      convexUrl,
      apiNamespace: normalizeApiNamespace(apiNamespace),
      auth:
        provider === "clerk"
          ? { provider: "clerk", publicConfig: { publishableKey, methods } }
          : { provider: "convex-auth", publicConfig: { methods } },
      updatedAt: Date.now(),
    };
    const validation = validateAdminProjectConfig(project);
    if (!validation.valid) {
      setIssues(validation.issues);
      return;
    }
    setIssues([]);
    setSaving(true);
    try {
      await onSave(project);
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "Could not save this project.",
      ]);
    } finally {
      setSaving(false);
    }
  };

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
              size={23}
              strokeWidth={2.2}
            />
          </View>
          <Text style={styles.eyebrow}>CONVEX FEEDBACK ADMIN</Text>
          <Text style={styles.title}>
            {initialProject ? "Edit project" : "Connect an admin project"}
          </Text>
          <Text style={styles.subtitle}>
            Add a deployment once. The app keeps public configuration and
            encrypted session data on this device.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionHeading
            color={theme.text}
            icon={<Server color={theme.primary} size={18} />}
            title="Project"
          />
          <Field
            label="Project name"
            onChangeText={setName}
            placeholder="My product"
            styles={styles}
            value={name}
          />
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            label="Convex deployment URL"
            onChangeText={setConvexUrl}
            placeholder="https://your-deployment.convex.cloud"
            styles={styles}
            value={convexUrl}
          />
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Convex API namespace</Text>
            <View style={styles.namespaceField}>
              <Text style={styles.namespacePrefix}>api.</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setApiNamespace}
                placeholder="feedback"
                placeholderTextColor={theme.mutedText}
                style={styles.namespaceInput}
                value={apiNamespace.replace(/^api\.?/i, "")}
              />
            </View>
            <Text style={styles.hint}>
              Use the namespace exported by your host app, without generated
              server secrets.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading
            color={theme.text}
            icon={<ShieldCheck color={theme.primary} size={18} />}
            title="Authentication provider"
          />
          <View style={styles.providerList}>
            {ADMIN_AUTH_PROVIDERS.map((option) => {
              const supported = option.status === "supported";
              const selected = provider === option.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !supported, selected }}
                  disabled={!supported}
                  key={option.id}
                  onPress={() => setProvider(option.id as SupportedProvider)}
                  style={({ pressed }) => [
                    styles.providerRow,
                    selected && styles.providerRowSelected,
                    !supported && styles.providerRowDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.radio, selected && styles.radioSelected]}
                  >
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.providerCopy}>
                    <View style={styles.providerTitleRow}>
                      <Text style={styles.providerTitle}>{option.label}</Text>
                      {!supported && (
                        <Text style={styles.comingSoon}>COMING SOON</Text>
                      )}
                    </View>
                    <Text style={styles.providerDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <ChevronRight
                    color={selected ? theme.primary : theme.mutedText}
                    size={17}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {provider === "clerk" && (
          <View style={styles.section}>
            <SectionHeading
              color={theme.text}
              icon={<KeyIcon color={theme.primary} />}
              title="Clerk public configuration"
            />
            <Field
              autoCapitalize="none"
              autoCorrect={false}
              label="Publishable key"
              onChangeText={setPublishableKey}
              placeholder="pk_test_…"
              styles={styles}
              value={publishableKey}
            />
            <Text style={styles.hint}>
              Only the publishable key belongs here. Do not paste a Clerk secret
              key.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeading
            color={theme.text}
            icon={<ShieldCheck color={theme.primary} size={18} />}
            title="Admin sign-in methods"
          />
          <Text style={styles.hint}>
            These choices describe methods enabled by the provider for
            administrators. The host deployment remains the source of truth.
          </Text>
          <MethodToggle
            description="Email and password"
            enabled={methods.password === true}
            label="Password"
            onPress={() => toggleMethod("password")}
            styles={styles}
          />
          <MethodToggle
            description="Send a one-time verification code by email"
            enabled={methods.emailCode === true}
            label="Email code"
            onPress={() => toggleMethod("emailCode")}
            styles={styles}
          />
          <Text style={styles.subsectionLabel}>SSO providers</Text>
          {DEFAULT_SSO_METHODS.map((method) => (
            <MethodToggle
              description={`Allow ${method.label} for administrator sign-in`}
              enabled={ssoMethods.some((entry) => entry.id === method.id)}
              key={method.id}
              label={method.label}
              onPress={() => toggleSso(method)}
              styles={styles}
            />
          ))}
          <Text style={styles.hint}>
            Apple is shown first in the login screen when it is enabled.
          </Text>
        </View>

        {issues.length > 0 && (
          <View style={styles.errorBox}>
            {issues.map((issue) => (
              <Text key={issue} style={styles.error}>
                • {issue}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.footerActions}>
          {onCancel && (
            <Pressable
              disabled={saving}
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.disabled,
              pressed && !saving && styles.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Plus color={theme.primaryForeground} size={17} />
            )}
            <Text style={styles.saveText}>
              {initialProject ? "Save changes" : "Save project"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.securityNote}>
          Configuration is encrypted with expo-secure-store. Server-side secrets
          are never requested or stored.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeading({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  return (
    <View style={headingStyles.row}>
      {icon}
      <Text style={[headingStyles.title, { color }]}>{title}</Text>
    </View>
  );
}

function MethodToggle({
  label,
  description,
  enabled,
  onPress,
  styles,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
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

function Field({
  label,
  styles,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={styles.inputColor.color}
        style={styles.input}
      />
    </View>
  );
}

function getInitialProvider(
  project: AdminProjectConfig | undefined,
): SupportedProvider {
  return project?.auth.provider === "clerk" ? "clerk" : "convex-auth";
}

function getInitialMethods(project: AdminProjectConfig): AdminAuthMethods {
  return project.auth.publicConfig.methods ?? {};
}

function KeyIcon({ color }: { color: string }) {
  return <LockKeyhole color={color} size={18} />;
}

const headingStyles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 9 },
  title: { fontSize: 15, fontWeight: "700" },
});

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { backgroundColor: theme.background, flex: 1 },
    content: { gap: 24, padding: 24, paddingBottom: 40 },
    header: { alignItems: "center", gap: 10, paddingBottom: 4 },
    logo: {
      alignItems: "center",
      backgroundColor: theme.primary,
      borderRadius: 18,
      height: 52,
      justifyContent: "center",
      width: 52,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.6,
    },
    title: {
      color: theme.text,
      fontSize: 27,
      fontWeight: "700",
      letterSpacing: -0.7,
      textAlign: "center",
    },
    subtitle: {
      color: theme.muted,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 360,
      textAlign: "center",
    },
    section: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 14,
      padding: 16,
    },
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
    providerList: { gap: 8 },
    providerRow: {
      alignItems: "center",
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      padding: 11,
    },
    providerRowSelected: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    providerRowDisabled: { opacity: 0.5 },
    providerCopy: { flex: 1, gap: 4 },
    providerTitleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
    providerTitle: { color: theme.text, fontSize: 13, fontWeight: "700" },
    providerDescription: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 16,
    },
    comingSoon: {
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
    subsectionLabel: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "700",
      paddingTop: 3,
    },
    methodRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 11,
      paddingVertical: 3,
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
    errorBox: {
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.danger,
      borderRadius: 14,
      borderWidth: 1,
      gap: 5,
      padding: 13,
    },
    error: { color: theme.danger, fontSize: 12, lineHeight: 18 },
    footerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-end",
    },
    cancelButton: {
      alignItems: "center",
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    cancelText: { color: theme.primary, fontSize: 13, fontWeight: "700" },
    saveButton: {
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
    saveText: {
      color: theme.primaryForeground,
      fontSize: 13,
      fontWeight: "700",
    },
    disabled: { opacity: 0.5 },
    securityNote: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 17,
      textAlign: "center",
    },
    pressed: { opacity: 0.68 },
  });
}
