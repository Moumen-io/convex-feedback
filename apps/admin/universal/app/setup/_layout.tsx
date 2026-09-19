import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useCallback } from "react";

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
  const setupMode =
    projectStore.setupMode ??
    (params.mode === "edit" || params.mode === "add" ? params.mode : null);
  const editingProjectId =
    projectStore.editingProject?.id ??
    (typeof params.projectId === "string" ? params.projectId : undefined);
  const initialProject =
    setupMode === "edit"
      ? (projectStore.editingProject ??
        projectStore.state.projects.find(
          (project) => project.id === editingProjectId,
        ))
      : undefined;

  const cancel = useCallback(() => {
    projectStore.cancelSetup();
    router.replace("/settings" as Href);
  }, [projectStore, router]);

  const save = useCallback(
    async (project: Parameters<typeof projectStore.completeSetup>[0]) => {
      await projectStore.completeSetup(project);
      router.replace("/inbox" as Href);
    },
    [projectStore, router],
  );

  return (
    <ProjectSetupProvider
      initialProject={initialProject}
      key={`${setupMode ?? "new"}:${initialProject?.id ?? "new"}`}
      onCancel={projectStore.activeProject ? cancel : undefined}
      onSave={save}
    >
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
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
        <Stack.Screen
          name="configuration"
          options={{ title: "Provider configuration" }}
        />
      </Stack>
    </ProjectSetupProvider>
  );
}
