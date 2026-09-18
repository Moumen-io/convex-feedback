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
const AUTH_STORAGE_REGISTRY_KEY = "__adminAuthStorageKeys";

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
  const tracker = getProjectAuthStorageTracker(namespace);
  return {
    getItem: (key) =>
      runTrackedStorageOperation(tracker, async () => {
        if (tracker.cleared) return null;
        const physicalKey = authPhysicalKey(namespace, key);
        await rememberPhysicalKey(tracker, physicalKey);
        return SecureStore.getItemAsync(physicalKey);
      }),
    setItem: (key, value) =>
      runTrackedStorageOperation(tracker, async () => {
        if (tracker.cleared) return;
        const physicalKey = authPhysicalKey(namespace, key);
        await rememberPhysicalKey(tracker, physicalKey);
        await SecureStore.setItemAsync(physicalKey, value);
      }),
    removeItem: (key) =>
      runTrackedStorageOperation(tracker, async () => {
        if (tracker.cleared) return;
        const physicalKey = authPhysicalKey(namespace, key);
        await rememberPhysicalKey(tracker, physicalKey);
        await SecureStore.deleteItemAsync(physicalKey);
      }),
  };
}

/** Must stay in sync with Convex Auth's storageNamespace passed by the runtime. */
export function getConvexAuthStorageNamespace(projectId: string): string {
  return `${CONVEX_AUTH_STORAGE_NAMESPACE_PREFIX}${projectId}`;
}

/** The registry key belongs to this package, not to an auth provider. */
export function getProjectAuthStorageRegistryKey(namespace: string): string {
  return secretKey(namespace, AUTH_STORAGE_REGISTRY_KEY);
}

export function createNamespacedClerkTokenCache(namespace: string): TokenCache {
  const tracker = getProjectAuthStorageTracker(namespace);
  return {
    getToken: (key) =>
      runTrackedStorageOperation(tracker, async () => {
        if (tracker.cleared) return null;
        const physicalKey = authPhysicalKey(namespace, key);
        await rememberPhysicalKey(tracker, physicalKey);
        return SecureStore.getItemAsync(physicalKey);
      }),
    saveToken: (key, token) =>
      runTrackedStorageOperation(tracker, async () => {
        if (tracker.cleared) return;
        const physicalKey = authPhysicalKey(namespace, key);
        await rememberPhysicalKey(tracker, physicalKey);
        await SecureStore.setItemAsync(physicalKey, token);
      }),
    clearToken: (key) =>
      runTrackedStorageOperation(tracker, async () => {
        if (tracker.cleared) return;
        const physicalKey = authPhysicalKey(namespace, key);
        await rememberPhysicalKey(tracker, physicalKey);
        await SecureStore.deleteItemAsync(physicalKey);
      }),
  };
}

/**
 * Delete every physical SecureStore key observed through this project's auth
 * storage wrappers. The provider owns the logical key names; this module only
 * records the exact physical keys it was asked to read or write.
 */
export async function clearProjectAuthStorage(
  namespace: string,
): Promise<void> {
  const tracker = getProjectAuthStorageTracker(namespace);
  let cleared = false;
  try {
    await runTrackedStorageOperation(tracker, async () => {
      await ensureTrackerLoaded(tracker);
      tracker.cleared = true;

      const results = await Promise.allSettled(
        [...tracker.physicalKeys].map((key) =>
          SecureStore.deleteItemAsync(key),
        ),
      );
      if (results.some((result) => result.status === "rejected")) {
        throw new Error(
          "Could not clear all stored authentication data for this project.",
        );
      }

      // The registry is owned by this package, not by a third-party auth
      // provider. Leave it in place when deletion fails so cleanup can retry.
      await SecureStore.deleteItemAsync(tracker.registryKey);
      tracker.physicalKeys.clear();
      cleared = true;
    });
  } finally {
    if (cleared) authStorageTrackers.delete(namespace);
  }
}

function sanitizeProject(value: unknown): AdminProjectConfig[] {
  try {
    const project = normalizeProjectConfig(value as AdminProjectConfig);
    return validateAdminProjectConfig(project).valid ? [project] : [];
  } catch {
    return [];
  }
}

interface ProjectAuthStorageTracker {
  namespace: string;
  registryKey: string;
  physicalKeys: Set<string>;
  loaded: Promise<void>;
  loadError?: unknown;
  queue: Promise<void>;
  cleared: boolean;
}

const authStorageTrackers = new Map<string, ProjectAuthStorageTracker>();

function getProjectAuthStorageTracker(
  namespace: string,
): ProjectAuthStorageTracker {
  const existing = authStorageTrackers.get(namespace);
  if (existing) return existing;

  const tracker = {} as ProjectAuthStorageTracker;
  tracker.namespace = namespace;
  tracker.registryKey = getProjectAuthStorageRegistryKey(namespace);
  tracker.physicalKeys = new Set<string>();
  tracker.queue = Promise.resolve();
  tracker.cleared = false;
  tracker.loaded = SecureStore.getItemAsync(tracker.registryKey)
    .then((raw) => {
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("The project authentication key registry is invalid.");
      }
      for (const key of parsed) {
        if (typeof key === "string" && isProjectAuthKey(namespace, key)) {
          tracker.physicalKeys.add(key);
        }
      }
    })
    .catch((error: unknown) => {
      tracker.loadError = error;
    });

  authStorageTrackers.set(namespace, tracker);
  return tracker;
}

function runTrackedStorageOperation<T>(
  tracker: ProjectAuthStorageTracker,
  operation: () => Promise<T>,
): Promise<T> {
  const next = tracker.queue.then(operation, operation);
  tracker.queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function ensureTrackerLoaded(
  tracker: ProjectAuthStorageTracker,
): Promise<void> {
  await tracker.loaded;
  if (tracker.loadError) throw tracker.loadError;
}

async function rememberPhysicalKey(
  tracker: ProjectAuthStorageTracker,
  physicalKey: string,
): Promise<void> {
  await ensureTrackerLoaded(tracker);
  if (tracker.physicalKeys.has(physicalKey)) return;

  tracker.physicalKeys.add(physicalKey);
  try {
    await SecureStore.setItemAsync(
      tracker.registryKey,
      JSON.stringify([...tracker.physicalKeys].sort()),
    );
  } catch (error) {
    tracker.physicalKeys.delete(physicalKey);
    throw error;
  }
}

function authPhysicalKey(namespace: string, providerKey: string): string {
  return secretKey(namespace, providerKey);
}

function isProjectAuthKey(namespace: string, key: string): boolean {
  return key.startsWith(projectAuthKeyPrefix(namespace));
}

function projectAuthKeyPrefix(namespace: string): string {
  return secretKey(namespace, "");
}

function secretKey(namespace: string, key: string): string {
  return `convex-feedback-admin.${namespace}.${key}`.replace(
    /[^A-Za-z0-9._-]/g,
    "_",
  );
}
