import { Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useCallback } from "react";

import { ProjectSetupProvider } from "@/components/ProjectSetupContext";
import { useProjectStore } from "@/components/ProjectStoreContext";
import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function ProjectSetupLayout() {
  const theme = useAdminTheme();
  const router = useRouter();
  const projectStore = useProjectStore();
  const initialProject =
    projectStore.setupMode === "edit" ? projectStore.editingProject : undefined;

  const cancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/settings" as Href);
    }
    projectStore.cancelSetup();
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
      key={`${projectStore.setupMode ?? "new"}:${initialProject?.id ?? "new"}`}
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
