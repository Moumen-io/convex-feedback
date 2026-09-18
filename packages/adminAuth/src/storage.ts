import type { TokenCache } from "@clerk/expo";
import type { TokenStorage } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";

import {
  normalizeProjectConfig,
  validateAdminProjectConfig,
} from "./config.js";
import type { AdminProjectConfig } from "./contracts.js";

export const ADMIN_PROJECT_STORE_KEY = "convex-feedback-admin.projects.v1";
export const CONVEX_AUTH_STORAGE_NAMESPACE_PREFIX = "convex-feedback-admin-";

export const CONVEX_AUTH_STORAGE_KEYS = [
  "__convexAuthJWT",
  "__convexAuthRefreshToken",
  "__convexAuthOAuthVerifier",
  "__convexAuthServerStateFetchTime",
] as const;

export interface AdminProjectStoreState {
  projects: AdminProjectConfig[];
  activeProjectId: string | null;
}

export interface AdminProjectStore {
  load: () => Promise<AdminProjectStoreState>;
  save: (state: AdminProjectStoreState) => Promise<void>;
  clear: () => Promise<void>;
}

export function createSecureProjectStore(
  storageKey = ADMIN_PROJECT_STORE_KEY,
): AdminProjectStore {
  return {
    async load() {
      const raw = await SecureStore.getItemAsync(storageKey);
      if (!raw) return { projects: [], activeProjectId: null };
      try {
        const parsed = JSON.parse(raw) as Partial<AdminProjectStoreState>;
        const projects = Array.isArray(parsed.projects)
          ? parsed.projects.flatMap((project) => sanitizeProject(project))
          : [];
        const activeProjectId =
          typeof parsed.activeProjectId === "string" &&
          projects.some((project) => project.id === parsed.activeProjectId)
            ? parsed.activeProjectId
            : (projects[0]?.id ?? null);
        const sanitizedState = { projects, activeProjectId };
        // Repair older or manually edited records so discarded secret-looking
        // fields do not remain in SecureStore.
        if (JSON.stringify(sanitizedState) !== raw) {
          await SecureStore.setItemAsync(
            storageKey,
            JSON.stringify(sanitizedState),
          );
        }
        return sanitizedState;
      } catch {
        return { projects: [], activeProjectId: null };
      }
    },
    async save(state) {
      const projects = state.projects.map((project) => {
        const normalized = normalizeProjectConfig(project);
        const validation = validateAdminProjectConfig(normalized);
        if (!validation.valid) {
          throw new Error(validation.issues.join(" "));
        }
        return normalized;
      });
      const activeProjectId = projects.some(
        (project) => project.id === state.activeProjectId,
      )
        ? state.activeProjectId
        : (projects[0]?.id ?? null);
      await SecureStore.setItemAsync(
        storageKey,
        JSON.stringify({ projects, activeProjectId }),
      );
    },
    async clear() {
      await SecureStore.deleteItemAsync(storageKey);
    },
  };
}

export function createSecureTokenStorage(namespace: string): TokenStorage {
  return {
    getItem: (key) => SecureStore.getItemAsync(secretKey(namespace, key)),
    setItem: (key, value) =>
      SecureStore.setItemAsync(secretKey(namespace, key), value),
    removeItem: (key) => SecureStore.deleteItemAsync(secretKey(namespace, key)),
  };
}

/** Must stay in sync with Convex Auth's storageNamespace passed by the runtime. */
export function getConvexAuthStorageNamespace(projectId: string): string {
  return `${CONVEX_AUTH_STORAGE_NAMESPACE_PREFIX}${projectId}`;
}

/** Convex Auth removes non-alphanumeric characters from its namespace keys. */
export function getConvexAuthStoredKey(
  projectId: string,
  key: (typeof CONVEX_AUTH_STORAGE_KEYS)[number],
): string {
  const escapedNamespace = getConvexAuthStorageNamespace(projectId).replace(
    /[^a-zA-Z0-9]/g,
    "",
  );
  return `${key}_${escapedNamespace}`;
}

export function createNamespacedClerkTokenCache(namespace: string): TokenCache {
  return {
    getToken: (key) => SecureStore.getItemAsync(secretKey(namespace, key)),
    saveToken: (key, token) =>
      SecureStore.setItemAsync(secretKey(namespace, key), token),
    clearToken: (key) => SecureStore.deleteItemAsync(secretKey(namespace, key)),
  };
}

/** Best-effort cleanup for a removed project; no server-side credentials exist here. */
export async function clearProjectAuthStorage(
  namespace: string,
): Promise<void> {
  const keys = [
    ...CONVEX_AUTH_STORAGE_KEYS.map((key) =>
      getConvexAuthStoredKey(namespace, key),
    ),
    "clerk-active-session",
    "clerk-token",
  ];
  await Promise.all(
    keys.map((key) => SecureStore.deleteItemAsync(secretKey(namespace, key))),
  );
}

function sanitizeProject(value: unknown): AdminProjectConfig[] {
  try {
    const project = normalizeProjectConfig(value as AdminProjectConfig);
    return validateAdminProjectConfig(project).valid ? [project] : [];
  } catch {
    return [];
  }
}

function secretKey(namespace: string, key: string): string {
  return `convex-feedback-admin.${namespace}.${key}`.replace(
    /[^A-Za-z0-9._-]/g,
    "_",
  );
}
