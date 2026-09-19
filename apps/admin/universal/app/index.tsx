import { Redirect } from "expo-router";

import { useProjectStore } from "@/components/ProjectStoreContext";

export default function IndexRedirect() {
  const projectStore = useProjectStore();
  if (projectStore.setupMode !== null || !projectStore.activeProject) {
    return (
      <Redirect
        href={{
          pathname: "/setup/convex",
          params: {
            ...(projectStore.setupMode ? { mode: projectStore.setupMode } : {}),
            ...(projectStore.editingProject?.id
              ? { projectId: projectStore.editingProject.id }
              : {}),
          },
        }}
      />
    );
  }
  return <Redirect href="/inbox" />;
}
