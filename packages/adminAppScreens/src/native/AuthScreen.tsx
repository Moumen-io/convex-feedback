import { isClerkRedirectAllowlistError } from "convex-feedback-admin-auth";
import type {
  AdminAuthController,
  AdminAuthSignInRequest,
  AdminMfaMethod,
} from "convex-feedback-admin-auth";
import {
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  LockKeyhole,
  Mail,
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

import { useAdminTheme, type AdminTheme } from "./theme.js";

export interface AdminAuthScreenProps {
  auth: AdminAuthController;
  projectName: string;
  onCancel?: () => void;
  nativeSsoRedirectUrl?: string;
  onCopySsoRedirect?: () => void | Promise<unknown>;
  onEditSsoSetup?: () => void;
}

export function AdminAuthScreen({
  auth,
  projectName,
  onCancel,
  nativeSsoRedirectUrl,
  onCopySsoRedirect,
  onEditSsoSetup,
}: AdminAuthScreenProps) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaMethod, setMfaMethod] = useState<AdminMfaMethod>("email-code");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showClerkRedirectSetup =
    auth.provider === "clerk" &&
    error !== null &&
    isClerkRedirectAllowlistError(error);

  const mfaMethods = useMemo(
    () => (auth.challenge?.kind === "mfa" ? auth.challenge.methods : []),
    [auth.challenge],
  );
  const mfaMethodKey = mfaMethods.join(",");
  const selectedMfaMethod = mfaMethods.includes(mfaMethod)
    ? mfaMethod
    : (mfaMethods[0] ?? "email-code");
  const mfaCanSendCode =
    selectedMfaMethod === "email-code" || selectedMfaMethod === "phone-code";
  const mfaIsEmailLink = selectedMfaMethod === "email-link";
  const mfaRequiresCode =
    selectedMfaMethod === "totp" || selectedMfaMethod === "backup-code";

  useEffect(() => {
    setCode("");
    setError(null);
    if (mfaMethods.length > 0) setMfaMethod(mfaMethods[0]!);
  }, [auth.challenge?.kind, mfaMethodKey]);

  const submit = async (request: AdminAuthSignInRequest) => {
    setPending(true);
    setError(null);
    try {
      const result = await auth.signIn(request);
      if (!result.ok) setError(result.error);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Authentication failed. Check the details and try again.",
      );
    } finally {
      setPending(false);
    }
  };

  if (auth.status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.loadingText}>Checking your session…</Text>
      </View>
    );
  }

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
          <Text style={styles.title}>Sign in to {projectName}</Text>
          <Text style={styles.subtitle}>
            Use an account that has administrator access to this project.
          </Text>
        </View>

        {auth.availableSsoMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Single sign-on</Text>
            <View style={styles.ssoList}>
              {sortSsoMethods(auth).map((method) => (
                <ActionButton
                  key={method.id}
                  disabled={pending}
                  icon={<KeyRound color={theme.text} size={17} />}
                  label={`Continue with ${method.label}`}
                  onPress={() => void submit({ kind: "sso", method })}
                  styles={styles}
                  tone="secondary"
                />
              ))}
            </View>
          </View>
        )}

        {auth.availableSsoMethods.length > 0 &&
          (auth.supportsPassword || auth.supportsEmailCode) && (
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>
          )}

        {auth.challenge?.kind === "mfa" ? (
          <View style={styles.section}>
            <View style={styles.challengeHeader}>
              <ShieldCheck color={theme.primary} size={19} />
              <View style={styles.challengeCopy}>
                <Text style={styles.sectionLabel}>Two-step verification</Text>
                <Text style={styles.helper}>{auth.challenge.title}</Text>
              </View>
            </View>
            {mfaMethods.length > 1 && (
              <View style={styles.mfaMethods}>
                {mfaMethods.map((method) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: selectedMfaMethod === method,
                    }}
                    key={method}
                    onPress={() => {
                      setMfaMethod(method);
                      setCode("");
                      setError(null);
                    }}
                    style={[
                      styles.mfaMethod,
                      selectedMfaMethod === method && styles.mfaMethodSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.mfaMethodText,
                        selectedMfaMethod === method &&
                          styles.mfaMethodTextSelected,
                      ]}
                    >
                      {mfaLabel(method)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {mfaIsEmailLink ? (
              <Text style={styles.helper}>
                We’ll send a verification link to your email address.
              </Text>
            ) : (
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  selectedMfaMethod === "backup-code" ? "off" : "one-time-code"
                }
                keyboardType={mfaKeyboardType(selectedMfaMethod)}
                onChangeText={setCode}
                placeholder={mfaPlaceholder(selectedMfaMethod)}
                placeholderTextColor={theme.mutedText}
                style={styles.input}
                value={code}
              />
            )}
            <ActionButton
              disabled={
                pending || (!mfaIsEmailLink && mfaRequiresCode && !code.trim())
              }
              label={
                mfaIsEmailLink
                  ? "Send email link"
                  : mfaCanSendCode && !code.trim()
                    ? `Send ${mfaLabel(selectedMfaMethod).toLowerCase()}`
                    : "Verify code"
              }
              onPress={() =>
                void submit({
                  kind: "mfa",
                  method: selectedMfaMethod,
                  code: mfaIsEmailLink ? undefined : code.trim() || undefined,
                })
              }
              styles={styles}
              tone="primary"
            />
          </View>
        ) : (
          <>
            {auth.supportsPassword && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Email and password</Text>
                <Field
                  autoCapitalize="none"
                  autoComplete="email"
                  icon={<Mail color={theme.mutedText} size={17} />}
                  keyboardType="email-address"
                  onChangeText={setIdentifier}
                  placeholder="Admin email"
                  styles={styles}
                  value={identifier}
                />
                <View style={styles.passwordWrap}>
                  <Field
                    autoCapitalize="none"
                    autoComplete="password"
                    icon={<LockKeyhole color={theme.mutedText} size={17} />}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    styles={styles}
                    value={password}
                  />
                  <Pressable
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onPress={() => setShowPassword((value) => !value)}
                    style={styles.passwordToggle}
                  >
                    {showPassword ? (
                      <EyeOff color={theme.mutedText} size={17} />
                    ) : (
                      <Eye color={theme.mutedText} size={17} />
                    )}
                  </Pressable>
                </View>
                <ActionButton
                  disabled={pending || !identifier.trim() || !password}
                  label="Sign in"
                  onPress={() =>
                    void submit({ kind: "password", identifier, password })
                  }
                  styles={styles}
                  tone="primary"
                />
              </View>
            )}

            {auth.supportsEmailCode && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Email code</Text>
                <Field
                  autoCapitalize="none"
                  autoComplete="email"
                  icon={<Mail color={theme.mutedText} size={17} />}
                  keyboardType="email-address"
                  onChangeText={setIdentifier}
                  placeholder="Admin email"
                  styles={styles}
                  value={identifier}
                />
                {auth.challenge?.kind === "email-code" && (
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="one-time-code"
                    keyboardType="number-pad"
                    onChangeText={setCode}
                    placeholder="Verification code"
                    placeholderTextColor={theme.mutedText}
                    style={styles.input}
                    value={code}
                  />
                )}
                <ActionButton
                  disabled={
                    pending ||
                    !identifier.trim() ||
                    (auth.challenge?.kind === "email-code" && !code.trim())
                  }
                  label={
                    auth.challenge?.kind === "email-code"
                      ? "Verify email code"
                      : "Email me a code"
                  }
                  onPress={() =>
                    void submit({
                      kind: "email-code",
                      email: identifier,
                      code:
                        auth.challenge?.kind === "email-code"
                          ? code
                          : undefined,
                    })
                  }
                  styles={styles}
                  tone="secondary"
                />
              </View>
            )}
          </>
        )}

        {error &&
          (showClerkRedirectSetup ? (
            <View style={styles.redirectSetupBox}>
              <Text style={styles.redirectSetupTitle}>SSO setup required</Text>
              <Text style={styles.redirectSetupBody}>
                This project's Clerk instance has not authorized the universal
                admin app callback yet.
              </Text>
              {nativeSsoRedirectUrl && (
                <View style={styles.redirectFieldGroup}>
                  <Text style={styles.redirectFieldLabel}>
                    Mobile SSO redirect URL
                  </Text>
                  <View style={styles.redirectField}>
                    <Text selectable style={styles.redirectFieldValue}>
                      {nativeSsoRedirectUrl}
                    </Text>
                    {onCopySsoRedirect && (
                      <Pressable
                        accessibilityLabel="Copy mobile SSO redirect URL"
                        accessibilityRole="button"
                        onPress={() => void onCopySsoRedirect()}
                        style={({ pressed }) => [
                          styles.redirectCopyButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Copy color={theme.primary} size={15} />
                        <Text style={styles.redirectCopyText}>Copy</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
              <Text style={styles.redirectSetupBody}>
                Add this URL in Clerk Dashboard → Native applications →
                Allowlist for mobile SSO redirect.
              </Text>
              <Text style={styles.redirectDetails}>Clerk error: {error}</Text>
              {onEditSsoSetup && (
                <Pressable
                  accessibilityRole="button"
                  onPress={onEditSsoSetup}
                  style={({ pressed }) => [
                    styles.redirectEditButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.redirectEditText}>Edit SSO setup</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text style={styles.error}>{error}</Text>
          ))}
        {onCancel && (
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Use a different project</Text>
          </Pressable>
        )}
        <Text style={styles.footer}>
          {auth.ssoAccountCreationPolicy === "existing-only"
            ? "Sign-in only · this app does not create accounts through SSO."
            : "Sign in with an account that already has administrator access."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function sortSsoMethods(auth: AdminAuthController) {
  return [...auth.availableSsoMethods].sort((left, right) => {
    if (left.id === "apple") return -1;
    if (right.id === "apple") return 1;
    return left.label.localeCompare(right.label);
  });
}

function mfaPlaceholder(method: AdminMfaMethod | undefined): string {
  if (method === "totp") return "Authenticator code";
  if (method === "backup-code") return "Backup code";
  return "Verification code";
}

function mfaKeyboardType(
  method: AdminMfaMethod | undefined,
): React.ComponentProps<typeof TextInput>["keyboardType"] {
  if (method === "email-code" || method === "phone-code" || method === "totp") {
    return "number-pad";
  }
  // Backup codes may contain letters and separators. Android's password
  // keyboard keeps that input alphanumeric without predictive suggestions;
  // the default iOS keyboard is the compatible equivalent.
  return Platform.OS === "android" ? "visible-password" : "default";
}

function mfaLabel(method: AdminMfaMethod): string {
  if (method === "email-code") return "Email code";
  if (method === "email-link") return "Email link";
  if (method === "phone-code") return "SMS code";
  if (method === "totp") return "Authenticator";
  return "Backup code";
}

function Field({
  icon,
  styles,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.inputWrap}>
      {icon}
      <TextInput
        {...props}
        placeholderTextColor={styles.inputColor.color}
        style={styles.inputInline}
      />
    </View>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  onPress,
  tone,
  styles,
}: {
  label: string;
  icon?: React.ReactNode;
  disabled: boolean;
  onPress: () => void;
  tone: "primary" | "secondary";
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        tone === "primary" ? styles.actionPrimary : styles.actionSecondary,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      {icon}
      <Text
        style={
          tone === "primary"
            ? styles.actionPrimaryText
            : styles.actionSecondaryText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { flexGrow: 1, justifyContent: "center", padding: 28, gap: 20 },
    loading: {
      alignItems: "center",
      backgroundColor: theme.background,
      flex: 1,
      gap: 12,
      justifyContent: "center",
    },
    loadingText: { color: theme.muted, fontSize: 14 },
    header: { alignItems: "center", gap: 10, marginBottom: 4 },
    logo: {
      alignItems: "center",
      backgroundColor: theme.primary,
      borderRadius: 18,
      height: 52,
      justifyContent: "center",
      marginBottom: 5,
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
      fontSize: 26,
      fontWeight: "700",
      letterSpacing: -0.7,
      textAlign: "center",
    },
    subtitle: {
      color: theme.muted,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 330,
      textAlign: "center",
    },
    section: { gap: 11 },
    sectionLabel: { color: theme.text, fontSize: 13, fontWeight: "700" },
    ssoList: { gap: 9 },
    challengeHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
    },
    challengeCopy: { flex: 1, gap: 3 },
    helper: { color: theme.muted, fontSize: 13, lineHeight: 19 },
    mfaMethods: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    mfaMethod: {
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    mfaMethodSelected: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    mfaMethodText: { color: theme.muted, fontSize: 12, fontWeight: "600" },
    mfaMethodTextSelected: { color: theme.primary, fontWeight: "700" },
    inputWrap: {
      alignItems: "center",
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      minHeight: 50,
      paddingHorizontal: 14,
    },
    inputInline: { color: theme.text, flex: 1, fontSize: 15, minHeight: 48 },
    inputColor: { color: theme.mutedText },
    input: {
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      color: theme.text,
      fontSize: 15,
      minHeight: 50,
      paddingHorizontal: 14,
    },
    passwordWrap: { position: "relative" },
    passwordToggle: { padding: 15, position: "absolute", right: 0, top: 0 },
    action: {
      alignItems: "center",
      borderRadius: 14,
      flexDirection: "row",
      gap: 9,
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: 16,
    },
    actionPrimary: { backgroundColor: theme.primary },
    actionSecondary: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
    },
    actionPrimaryText: {
      color: theme.primaryForeground,
      fontSize: 14,
      fontWeight: "700",
    },
    actionSecondaryText: { color: theme.text, fontSize: 14, fontWeight: "700" },
    actionDisabled: { opacity: 0.45 },
    actionPressed: { opacity: 0.72 },
    dividerRow: { alignItems: "center", flexDirection: "row", gap: 10 },
    divider: {
      backgroundColor: theme.border,
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    dividerText: {
      color: theme.mutedText,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
    },
    error: {
      color: theme.danger,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    redirectSetupBox: {
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.danger,
      borderRadius: 14,
      borderWidth: 1,
      gap: 9,
      padding: 14,
    },
    redirectSetupTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "800",
    },
    redirectSetupBody: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 18,
    },
    redirectFieldGroup: { gap: 6 },
    redirectFieldLabel: { color: theme.text, fontSize: 11, fontWeight: "700" },
    redirectField: {
      alignItems: "center",
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 42,
      paddingLeft: 10,
    },
    redirectFieldValue: {
      color: theme.muted,
      flex: 1,
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
      fontSize: 10,
      paddingVertical: 9,
    },
    redirectCopyButton: {
      alignItems: "center",
      borderLeftColor: theme.border,
      borderLeftWidth: 1,
      flexDirection: "row",
      gap: 4,
      minHeight: 40,
      paddingHorizontal: 10,
    },
    redirectCopyText: { color: theme.primary, fontSize: 11, fontWeight: "700" },
    redirectDetails: {
      color: theme.mutedText,
      fontSize: 10,
      lineHeight: 15,
    },
    redirectEditButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      paddingVertical: 3,
    },
    redirectEditText: { color: theme.primary, fontSize: 12, fontWeight: "700" },
    pressed: { opacity: 0.68 },
    cancelButton: { alignItems: "center", paddingVertical: 4 },
    cancelText: { color: theme.primary, fontSize: 13, fontWeight: "700" },
    footer: { color: theme.mutedText, fontSize: 11, textAlign: "center" },
  });
}
