import {
  AdminAccountModal,
  AdminSettingsScreen,
  useAdminTheme,
} from "convex-feedback-admin-app-screens/native";
import {
  AdminAuthAccountView,
  useAdminAuth,
} from "convex-feedback-admin-auth/native";
import { useState } from "react";

import { useUniversalAdmin } from "@/components/RuntimeContext";
import { Alert, Linking, Pressable, Text, View } from "react-native";

const LEGAL_BASE =
  "https://github.com/Moumen-io/convex-feedback/blob/main/apps/admin/universal";

export default function SettingsScreen() {
  const auth = useAdminAuth();
  const runtime = useUniversalAdmin();
  const theme = useAdminTheme();
  const [accountOpen, setAccountOpen] = useState(false);

  const account = auth.account;
  const changeProject = async (projectId: string) => {
    if (projectId === runtime.project.id) return;
    await runtime.onSelectProject(projectId);
  };
  const removeProject = (projectId: string) => {
    Alert.alert(
      "Are you sure?",
      "This will remove the project from your account.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void runtime.onRemoveProject(projectId),
        },
      ],
    );
  };

  return (
    <>
      <AdminSettingsScreen
        account={account}
        activeProjectId={runtime.project.id}
        onAddProject={runtime.onAddProject}
        onEditProject={runtime.onEditProject}
        onManageAccount={
          auth.provider === "clerk" ? () => setAccountOpen(true) : undefined
        }
        onRemoveProject={removeProject}
        onSelectProject={(projectId) => void changeProject(projectId)}
        onSignOut={() => void auth.signOut()}
        projects={runtime.projects}
      />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, flexDirection: "row", gap: 24 }}>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${LEGAL_BASE}/PRIVACY.md`)}>
          <Text style={{ color: theme.mutedText, fontSize: 13 }}>Privacy Policy</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${LEGAL_BASE}/TERMS.md`)}>
          <Text style={{ color: theme.mutedText, fontSize: 13 }}>Terms of Use</Text>
        </Pressable>
      </View>
      <AdminAccountModal
        onClose={() => setAccountOpen(false)}
        theme={theme}
        visible={accountOpen}
      >
        <AdminAuthAccountView onDismiss={() => setAccountOpen(false)} />
      </AdminAccountModal>
    </>
  );
}
