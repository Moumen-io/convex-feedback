import { useAuth, useUser } from "@clerk/expo";
import { UserProfileView } from "@clerk/expo/native";
import { useState } from "react";

import {
  AdminAccountModal,
  AdminSettingsScreen,
} from "convex-feedback-admin-app-screens/native";

import { useAdminTheme } from "@/constants/AdminTheme";

export default function SettingsScreen() {
  const [accountOpen, setAccountOpen] = useState(false);
  const { signOut } = useAuth();
  const { user } = useUser();
  const theme = useAdminTheme();
  const account = user
    ? {
        name: user.fullName ?? user.username ?? undefined,
        email: user.primaryEmailAddress?.emailAddress,
        imageUrl: user.imageUrl,
      }
    : undefined;

  return (
    <>
      <AdminSettingsScreen
        account={account}
        onManageAccount={() => setAccountOpen(true)}
        onSignOut={() => void signOut()}
        theme={theme}
      />
      <AdminAccountModal
        onClose={() => setAccountOpen(false)}
        theme={theme}
        visible={accountOpen}
      >
        <UserProfileView
          isDismissible={false}
          onDismiss={() => setAccountOpen(false)}
          style={{ flex: 1 }}
        />
      </AdminAccountModal>
    </>
  );
}
