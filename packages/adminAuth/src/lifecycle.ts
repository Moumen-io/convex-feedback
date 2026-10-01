import type {
  AdminAuthLastUsed,
  AdminAuthSignInRequest,
  AdminProjectConfig,
} from "./contracts.js";
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
    getProjectAuthInstanceIdentity(previous) !==
    getProjectAuthInstanceIdentity(next)
  );
}

/**
 * A stable identity for the auth instance and deployment, excluding enabled
 * sign-in methods so a UI-only method change does not discard a valid session.
 */
export function getProjectAuthInstanceIdentity(
  project: AdminProjectConfig,
): string {
  const { auth } = project;
  let instance: unknown;
  if (auth.provider === "clerk") {
    instance = { publishableKey: auth.publicConfig.publishableKey };
  } else if (auth.provider === "convex-auth") {
    instance = { providerIds: auth.publicConfig.providerIds };
  } else {
    instance = { publicConfig: auth.publicConfig.publicConfig ?? {} };
  }

  return JSON.stringify({
    convexUrl: project.convexUrl,
    apiNamespace: project.apiNamespace,
    provider: auth.provider,
    instance,
  });
}

/** Build the safe metadata candidate associated with a primary sign-in try. */
export function createAdminAuthLastUsed(
  project: AdminProjectConfig,
  request: AdminAuthSignInRequest,
  accountEmail?: string,
): AdminAuthLastUsed | null {
  let method: AdminAuthLastUsed["method"];
  let email: string | undefined;
  switch (request.kind) {
    case "password":
      method = { kind: "password" };
      email = request.identifier;
      break;
    case "email-code":
      method = { kind: "email-code" };
      email = request.email;
      break;
    case "sso":
      method = { kind: "sso", id: request.method.id };
      email = accountEmail;
      break;
    case "mfa":
      return null;
  }

  const normalizedEmail = email?.trim();
  return {
    provider: project.auth.provider,
    instanceIdentity: getProjectAuthInstanceIdentity(project),
    method,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
  };
}

export function isAdminAuthLastUsedForProject(
  project: AdminProjectConfig,
  lastUsed: AdminAuthLastUsed,
): boolean {
  return (
    lastUsed.provider === project.auth.provider &&
    lastUsed.instanceIdentity === getProjectAuthInstanceIdentity(project)
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
