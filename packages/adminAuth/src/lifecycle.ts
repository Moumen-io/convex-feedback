import type { AdminProjectConfig } from "./contracts.js";
import type { AdminProjectStoreState } from "./storage.js";

/**
 * Authentication is tied to the deployment and public auth configuration.
 * The API namespace is included because it identifies the host API that the
 * authenticated session is being used to administer.
 */
export function projectAuthStateRequiresReset(
  previous: AdminProjectConfig,
  next: AdminProjectConfig,
): boolean {
  return (
    previous.convexUrl !== next.convexUrl ||
    previous.apiNamespace !== next.apiNamespace ||
    JSON.stringify(previous.auth) !== JSON.stringify(next.auth)
  );
}

/** A configuration-sensitive key for remounting the complete project runtime. */
export function getProjectRuntimeKey(project: AdminProjectConfig): string {
  return JSON.stringify({
    id: project.id,
    convexUrl: project.convexUrl,
    apiNamespace: project.apiNamespace,
    auth: project.auth,
    updatedAt: project.updatedAt,
  });
}

export function selectProject(
  state: AdminProjectStoreState,
  projectId: string,
): AdminProjectStoreState {
  if (
    state.activeProjectId === projectId ||
    !state.projects.some((project) => project.id === projectId)
  ) {
    return state;
  }
  return { ...state, activeProjectId: projectId };
}

export function saveProject(
  state: AdminProjectStoreState,
  project: AdminProjectConfig,
): AdminProjectStoreState {
  const exists = state.projects.some((entry) => entry.id === project.id);
  const projects = exists
    ? state.projects.map((entry) => (entry.id === project.id ? project : entry))
    : [...state.projects, project];
  return { projects, activeProjectId: project.id };
}

export function removeProject(
  state: AdminProjectStoreState,
  projectId: string,
): AdminProjectStoreState {
  const projects = state.projects.filter((project) => project.id !== projectId);
  const activeProjectId =
    state.activeProjectId === projectId
      ? (projects[0]?.id ?? null)
      : state.activeProjectId;
  return { projects, activeProjectId };
}
