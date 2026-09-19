import { useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { View } from "react-native";

import { useProjectSetup } from "@/components/ProjectSetupContext";
import {
  createSetupStyles,
  SetupOption,
  SetupPage,
  SetupSection,
} from "@/components/setup/SetupUI";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";
import { ADMIN_AUTH_PROVIDERS } from "convex-feedback-admin-auth";

export default function ProviderSelectionRoute() {
  const theme = useAdminTheme();
  const styles = createSetupStyles(theme);
  const router = useRouter();
  const setup = useProjectSetup();

  return (
    <SetupPage
      step={2}
      onContinue={() => router.push("/setup/methods")}
      showBack
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
