import { KeyRound } from "lucide-react-native";
import { Text } from "react-native";

import { useProjectSetup } from "@/components/ProjectSetupContext";
import {
  createSetupStyles,
  SetupField,
  SetupIssues,
  SetupPage,
  SetupSection,
} from "@/components/setup/SetupUI";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function ProviderConfigurationRoute() {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  const setup = useProjectSetup();

  return (
    <SetupPage
      step={setup.requiresSsoSetup ? 5 : 4}
      totalSteps={setup.setupStepCount}
      showBack
      backDisabled={setup.saving}
      continueDisabled={setup.saving}
      continueLabel={
        setup.saving
          ? "Saving…"
          : setup.isEditing
            ? "Save changes"
            : "Save project"
      }
      onContinue={() => void setup.save()}
    >
      {setup.provider === "clerk" ? (
        <SetupSection
          icon={<KeyRound color={theme.primary} size={18} />}
          title="Clerk public configuration"
        >
          <SetupField
            autoCapitalize="none"
            autoCorrect={false}
            label="Publishable key"
            onChangeText={setup.setPublishableKey}
            placeholder="pk_test_…"
            value={setup.publishableKey}
          />
          <Text style={styles.hint}>
            Only the publishable key belongs here. Do not paste a Clerk secret
            key.
          </Text>
        </SetupSection>
      ) : (
        <SetupSection
          icon={<KeyRound color={theme.primary} size={18} />}
          title="Convex Auth provider IDs"
        >
          <Text style={styles.hint}>
            Enter the exact IDs configured by the host deployment. They can
            differ from the labels shown above and from Convex Auth defaults.
          </Text>
          {setup.methods.password === true && (
            <SetupField
              autoCapitalize="none"
              autoCorrect={false}
              label="Password provider ID"
              onChangeText={(value) => setup.setProviderId("password", value)}
              placeholder="Configured password ID"
              value={setup.providerIds.password}
            />
          )}
          {setup.methods.emailCode === true && (
            <SetupField
              autoCapitalize="none"
              autoCorrect={false}
              label="Email-code provider ID"
              onChangeText={(value) => setup.setProviderId("emailCode", value)}
              placeholder="Configured email provider ID"
              value={setup.providerIds.emailCode}
            />
          )}
          {setup.methods.sso?.map((method) => (
            <SetupField
              autoCapitalize="none"
              autoCorrect={false}
              key={method.id}
              label={`${method.label} provider ID`}
              onChangeText={(value) => setup.setSsoProviderId(method.id, value)}
              placeholder={`Configured ${method.label} provider ID`}
              value={setup.providerIds.sso[method.id] ?? ""}
            />
          ))}
        </SetupSection>
      )}
      <SetupIssues issues={setup.issues} />
    </SetupPage>
  );
}
