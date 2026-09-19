import * as Clipboard from "expo-clipboard";
import { Redirect, useRouter } from "expo-router";
import { KeyRound, ShieldCheck } from "lucide-react-native";
import { Text } from "react-native";

import { useProjectSetup } from "@/components/ProjectSetupContext";
import {
  createSetupStyles,
  SetupCopyField,
  SetupPage,
  SetupSection,
} from "@/components/setup/SetupUI";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";
import { getNativeAuthCallbackUrl } from "convex-feedback-admin-auth/native-callback";

export default function SsoAppSetupRoute() {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  const router = useRouter();
  const setup = useProjectSetup();

  if (!setup.requiresSsoSetup) {
    return <Redirect href="/setup/methods" />;
  }

  const redirectUrl = getNativeAuthCallbackUrl();
  const isClerk = setup.provider === "clerk";

  return (
    <SetupPage
      showBack
      step={4}
      totalSteps={setup.setupStepCount}
      onContinue={() => router.push("/setup/configuration")}
    >
      <SetupSection
        icon={
          isClerk ? (
            <KeyRound color={theme.primary} size={18} />
          ) : (
            <ShieldCheck color={theme.primary} size={18} />
          )
        }
        title={isClerk ? "Configure Clerk SSO" : "Configure Convex Auth SSO"}
      >
        <Text style={styles.hint}>
          {isClerk
            ? "Before SSO can return to the universal admin app, Clerk must authorize the app's callback URL."
            : "Before SSO can return to the universal admin app, Convex Auth must allow the app's callback URL in the host's redirect callback."}
        </Text>
        <SetupCopyField
          label="Mobile SSO redirect URL"
          onCopy={() => Clipboard.setStringAsync(redirectUrl)}
          value={redirectUrl}
        />
        <Text style={styles.hint}>
          {isClerk
            ? "Add this URL in Clerk Dashboard → Native applications → Allowlist for mobile SSO redirect."
            : "Allow this exact URL in your Convex Auth server's callbacks.redirect callback."}
        </Text>
      </SetupSection>
    </SetupPage>
  );
}
