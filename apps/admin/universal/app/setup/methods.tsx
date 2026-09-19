import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { Text } from "react-native";

import { useProjectSetup } from "@/components/ProjectSetupContext";
import {
  createSetupStyles,
  SetupIssues,
  SetupMethodToggle,
  SetupPage,
  SetupSection,
} from "@/components/setup/SetupUI";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";
import { DEFAULT_SSO_METHODS } from "convex-feedback-admin-auth";

export default function SignInMethodsRoute() {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  const router = useRouter();
  const setup = useProjectSetup();
  const ssoMethods = setup.methods.sso ?? [];

  const continueSetup = () => {
    if (!setup.validateSignInMethods()) return;
    router.push("/setup/configuration" as Href);
  };

  return (
    <SetupPage step={3} onContinue={continueSetup} showBack>
      <SetupSection
        icon={<ShieldCheck color={theme.primary} size={18} />}
        title="Admin sign-in methods"
      >
        <Text style={styles.hint}>
          The host deployment remains the source of truth. Enable every method
          that administrators can use.
        </Text>
        <SetupMethodToggle
          description="Email and password"
          enabled={setup.methods.password === true}
          label="Password"
          onPress={() => setup.setPasswordEnabled(!setup.methods.password)}
        />
        <SetupMethodToggle
          description="Send a one-time verification code by email"
          enabled={setup.methods.emailCode === true}
          label="Email code"
          onPress={() => setup.setEmailCodeEnabled(!setup.methods.emailCode)}
        />
        <Text style={styles.subsectionLabel}>SSO providers</Text>
        {DEFAULT_SSO_METHODS.map((method) => (
          <SetupMethodToggle
            description={`Allow ${method.label} for administrator sign-in`}
            enabled={ssoMethods.some((entry) => entry.id === method.id)}
            key={method.id}
            label={method.label}
            onPress={() => setup.toggleSsoMethod(method)}
          />
        ))}
        <Text style={styles.hint}>
          Apple is shown first in the login screen when it is enabled.
        </Text>
      </SetupSection>
      <SetupIssues issues={setup.issues} />
    </SetupPage>
  );
}
