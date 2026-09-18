import { createContext, useContext } from "react";

import type { AdminProjectConfig } from "convex-feedback-admin-auth";
import type { AdminProjectSummary } from "convex-feedback-admin-app-screens/native";

export interface UniversalAdminContextValue {
  project: AdminProjectConfig;
  projects: AdminProjectSummary[];
  onSelectProject: (projectId: string) => Promise<void> | void;
  onAddProject: () => void;
  onEditProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => Promise<void> | void;
}

const RuntimeContext = createContext<UniversalAdminContextValue | null>(null);

export const RuntimeContextProvider = RuntimeContext.Provider;

export function useUniversalAdmin(): UniversalAdminContextValue {
  const value = useContext(RuntimeContext);
  if (!value)
    throw new Error(
      "useUniversalAdmin must be used inside the universal admin app.",
    );
  return value;
}
