import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { PlugZap, Server } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { useProjectSetup } from "@/components/ProjectSetupContext";
import {
  createSetupStyles,
  SetupField,
  SetupFooter,
  SetupIssues,
  SetupPage,
  SetupSection,
} from "@/components/setup/SetupUI";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function ConvexSetupRoute() {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  const router = useRouter();
  const setup = useProjectSetup();
  const [continuing, setContinuing] = useState(false);

  const continueSetup = async () => {
    if (!setup.validateConvexFields()) return;
    setContinuing(true);
    try {
      const connection =
        setup.connectionTest?.key === setup.connectionKey &&
        setup.connectionTest.status === "success"
          ? { ok: true as const }
          : await setup.testConnection();
      if (!connection.ok) return;
      router.push("/setup/provider" as Href);
    } finally {
      setContinuing(false);
    }
  };

  return (
    <SetupPage
      step={1}
      subtitle="Connect the deployment that hosts your feedback API before choosing how administrators sign in."
      title={
        setup.isEditing ? "Edit project connection" : "Connect an admin project"
      }
      footer={
        <SetupFooter
          disabled={continuing || setup.connectionTest?.status === "testing"}
          nextLabel="Continue"
          onCancel={setup.canCancel ? setup.cancel : undefined}
          onNext={() => void continueSetup()}
        />
      }
    >
      <SetupSection
        icon={<Server color={theme.primary} size={18} />}
        title="Project"
      >
        <SetupField
          label="Project name"
          onChangeText={setup.setProjectName}
          placeholder="My product"
          value={setup.draft.name}
        />
        <SetupField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          label="Convex deployment URL"
          onChangeText={setup.setConvexUrl}
          placeholder="https://your-deployment.convex.cloud"
          value={setup.draft.convexUrl}
        />
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Convex API namespace</Text>
          <View style={styles.namespaceField}>
            <Text style={styles.namespacePrefix}>api.</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setup.setApiNamespace}
              placeholder="feedback"
              placeholderTextColor={theme.mutedText}
              style={styles.namespaceInput}
              value={setup.draft.apiNamespace.replace(/^api\.?/i, "")}
            />
          </View>
          <Text style={styles.hint}>
            Use the namespace exported by your host app, without generated
            server secrets.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={setup.connectionTest?.status === "testing" || continuing}
            onPress={() => void setup.testConnection()}
            style={({ pressed }) => [
              styles.connectionAction,
              (setup.connectionTest?.status === "testing" || continuing) &&
                styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {setup.connectionTest?.status === "testing" ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <PlugZap color={theme.primary} size={17} />
            )}
            <Text style={styles.connectionActionText}>
              {setup.connectionTest?.status === "success"
                ? "Test connection again"
                : "Test connection"}
            </Text>
          </Pressable>
          {setup.connectionTest?.key === setup.connectionKey &&
            setup.connectionTest.status === "success" && (
              <Text style={styles.connectionSuccess}>
                Connected: api.
                {setup.draft.apiNamespace.replace(/^api\.?/i, "")}.isAdmin
                responded successfully. It returned{" "}
                {setup.connectionTest.isAdmin ? "true" : "false"};{" "}
                {setup.connectionTest.isAdmin
                  ? "continue with an admin account after saving."
                  : "an unauthenticated connection is ready; sign in with an admin account after saving."}
              </Text>
            )}
          {setup.connectionTest?.key === setup.connectionKey &&
            setup.connectionTest.status === "error" && (
              <Text style={styles.connectionError}>
                {setup.connectionTest.message}
              </Text>
            )}
        </View>
      </SetupSection>
      <SetupIssues issues={setup.issues} />
    </SetupPage>
  );
}
