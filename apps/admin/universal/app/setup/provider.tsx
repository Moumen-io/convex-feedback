import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { View } from "react-native";

import { useProjectSetup } from "@/components/ProjectSetupContext";
import {
  createSetupStyles,
  SetupFooter,
  SetupOption,
  SetupPage,
  SetupSection,
} from "@/components/setup/SetupUI";
import { ADMIN_AUTH_PROVIDERS } from "convex-feedback-admin-auth";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function ProviderSelectionRoute() {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  const router = useRouter();
  const setup = useProjectSetup();

  return (
    <SetupPage
      step={2}
      subtitle="Choose the authentication adapter used by the host deployment."
      title="Choose an auth provider"
      footer={
        <SetupFooter
          nextLabel="Continue"
          onNext={() => router.push("/setup/methods" as Href)}
        />
      }
    >
      <SetupSection
        icon={<ShieldCheck color={theme.primary} size={18} />}
        title="Authentication provider"
      >
        <View style={styles.optionList}>
          {ADMIN_AUTH_PROVIDERS.map((option) => {
            const supported = option.status === "supported";
            return (
              <SetupOption
                description={option.description}
                disabled={!supported}
                key={option.id}
                label={option.label}
                meta={supported ? undefined : "COMING SOON"}
                onPress={() => {
                  if (supported) {
                    setup.selectProvider(option.id as "convex-auth" | "clerk");
                  }
                }}
                selected={setup.provider === option.id}
              />
            );
          })}
        </View>
      </SetupSection>
    </SetupPage>
  );
}
