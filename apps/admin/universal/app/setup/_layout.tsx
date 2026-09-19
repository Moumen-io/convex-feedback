import type { Href } from "expo-router";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { ProjectSetupProvider } from "@/components/ProjectSetupContext";
import { useProjectStore } from "@/components/ProjectStoreContext";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function ProjectSetupLayout() {
  const theme = useAdminTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    projectId?: string;
  }>();
  const projectStore = useProjectStore();
  const recoveryAttemptedRef = useRef(false);
  const setupMode = projectStore.setupMode;
  const requestedMode =
    params.mode === "edit" || params.mode === "add" ? params.mode : undefined;
  const requestedProjectId =
    typeof params.projectId === "string" ? params.projectId : undefined;

  useEffect(() => {
    if (recoveryAttemptedRef.current) return;
    if (setupMode !== null) {
      recoveryAttemptedRef.current = true;
      return;
    }

    // A URL hint can recover a setup session after a cold deep link, but the
    // resulting mode is immediately stored in ProjectStoreContext. All setup
    // screens then read that store value, so losing query params while moving
    // through the Stack cannot change the lifecycle.
    if (requestedMode === "edit") {
      if (
        requestedProjectId &&
        projectStore.startEditProject(requestedProjectId)
      ) {
        recoveryAttemptedRef.current = true;
        return;
      }

      // An expired or invalid project ID can still recover into a new setup
      // session instead of leaving the store without a lifecycle mode.
      projectStore.startAddProject();
      recoveryAttemptedRef.current = true;
      return;
    }

    projectStore.startAddProject();
    recoveryAttemptedRef.current = true;
  }, [projectStore, requestedMode, requestedProjectId, setupMode]);

  const initialProject =
    setupMode === "edit" ? projectStore.editingProject : undefined;

  const cancel = useCallback(() => {
    projectStore.cancelSetup();
    router.replace("/settings" as Href);
  }, [projectStore, router]);

  const save = useCallback(
    async (project: Parameters<typeof projectStore.completeSetup>[0]) => {
      await projectStore.completeSetup(project);
      router.replace("/inbox");
    },
    [projectStore, router],
  );

  return (
    <ProjectSetupProvider
      initialProject={initialProject}
      // This identity is stable while the store's setup session is active;
      // the provider therefore remains mounted as child routes are pushed and
      // popped within this Stack.
      key={`project-setup:${setupMode ?? "recovery"}:${initialProject?.id ?? "new"}`}
      onCancel={projectStore.activeProject ? cancel : undefined}
      onSave={save}
    >
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: true,
        }}
      >
        <Stack.Screen
          name="convex"
          options={{
            headerBackVisible: false,
            title: "Convex setup",
          }}
        />
        <Stack.Screen name="provider" options={{ title: "Auth provider" }} />
        <Stack.Screen name="methods" options={{ title: "Sign-in methods" }} />
        <Stack.Screen name="sso" options={{ title: "SSO app setup" }} />
        <Stack.Screen
          name="configuration"
          options={{ title: "Provider configuration" }}
        />
      </Stack>
      {/* <Host>
        <Stack.Toolbar>
          <Stack.Toolbar.Button icon="chevron.left" />
          <Stack.Toolbar.Spacer />
          <Stack.Toolbar.Button variant="prominent" tintColor={theme.primary}>
            Continue
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </Host> */}
    </ProjectSetupProvider>
  );
}
