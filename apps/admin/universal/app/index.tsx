import { Redirect, type Href } from "expo-router";

import { useProjectStore } from "@/components/ProjectStoreContext";

export default function IndexRedirect() {
  const projectStore = useProjectStore();
  if (projectStore.setupMode !== null || !projectStore.activeProject) {
    return (
      <Redirect
        href={
          {
            pathname: "/setup/convex",
            params: {
              mode: projectStore.setupMode === "edit" ? "edit" : "add",
              ...(projectStore.editingProject?.id
                ? { projectId: projectStore.editingProject.id }
                : {}),
            },
          } as Href
        }
      />
    );
  }
  return <Redirect href={"/inbox" as Href} />;
}
