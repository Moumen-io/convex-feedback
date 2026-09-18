import {
  AdminAuthAccountView,
  useAdminAuth,
} from "convex-feedback-admin-auth/native";
import {
  AdminAccountModal,
  AdminSettingsScreen,
  useAdminTheme,
} from "convex-feedback-admin-app-screens/native";
import { useState } from "react";

import { useUniversalAdmin } from "@/components/RuntimeContext";

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
  const removeProject = async (projectId: string) => {
    await runtime.onRemoveProject(projectId);
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
        onRemoveProject={(projectId) => void removeProject(projectId)}
        onSelectProject={(projectId) => void changeProject(projectId)}
        onSignOut={() => void auth.signOut()}
        projects={runtime.projects}
      />
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
