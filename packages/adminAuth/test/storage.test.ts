import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    deleteItemAsync: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    reset: () => {
      values.clear();
    },
  };
});

vi.mock("expo-secure-store", () => secureStore);

import {
  clearProjectAuthStorage,
  createNamespacedClerkTokenCache,
  createSecureProjectStore,
  createSecureTokenStorage,
  getConvexAuthStorageNamespace,
  getProjectAuthStorageRegistryKey,
} from "../src/storage.js";

describe("project auth storage", () => {
  beforeEach(() => {
    secureStore.reset();
    vi.clearAllMocks();
  });

  it("uses a project-specific Convex Auth namespace", () => {
    expect(getConvexAuthStorageNamespace("team-1")).toBe(
      "convex-feedback-admin-team-1",
    );
  });

  it("tracks and clears the exact keys supplied by Convex Auth and Clerk", async () => {
    const convexStorage = createSecureTokenStorage("team-1");
    const clerkTokenCache = createNamespacedClerkTokenCache("team-1");

    // These are the keys the installed providers pass to their storage
    // adapters. The cleanup implementation itself does not need to know them.
    await convexStorage.setItem(
      "__convexAuthJWT_convexfeedbackadminteam1",
      "convex-token",
    );
    await convexStorage.setItem(
      "__convexAuthRefreshToken_convexfeedbackadminteam1",
      "convex-refresh-token",
    );
    await clerkTokenCache.saveToken("__clerk_client_jwt", "clerk-client-token");

    await clearProjectAuthStorage("team-1");

    expect(
      secureStore.values.get(
        "convex-feedback-admin.team-1.__convexAuthJWT_convexfeedbackadminteam1",
      ),
    ).toBeUndefined();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.__convexAuthJWT_convexfeedbackadminteam1",
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.__convexAuthRefreshToken_convexfeedbackadminteam1",
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.__clerk_client_jwt",
    );
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.clerk-token",
    );
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.clerk-active-session",
    );
  });

  it("clears a persisted registry even when no auth runtime is mounted", async () => {
    const physicalKey = "convex-feedback-admin.team-1.provider-key-from-sdk";
    secureStore.values.set(
      getProjectAuthStorageRegistryKey("team-1"),
      JSON.stringify([physicalKey]),
    );

    await clearProjectAuthStorage("team-1");

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(physicalKey);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      getProjectAuthStorageRegistryKey("team-1"),
    );
  });

  it("keeps auth storage isolated between projects", async () => {
    const projectOne = createSecureTokenStorage("one");
    const projectTwo = createSecureTokenStorage("two");
    const clerkOne = createNamespacedClerkTokenCache("one");
    const clerkTwo = createNamespacedClerkTokenCache("two");

    await projectOne.setItem("provider-token", "one-token");
    await projectTwo.setItem("provider-token", "two-token");
    await clerkOne.saveToken("__clerk_client_jwt", "one-clerk-token");
    await clerkTwo.saveToken("__clerk_client_jwt", "two-clerk-token");
    await clearProjectAuthStorage("one");

    expect(
      secureStore.values.get("convex-feedback-admin.two.provider-token"),
    ).toBe("two-token");
    expect(
      secureStore.values.get("convex-feedback-admin.one.provider-token"),
    ).toBeUndefined();
    expect(
      secureStore.values.get("convex-feedback-admin.two.__clerk_client_jwt"),
    ).toBe("two-clerk-token");
    expect(
      secureStore.values.get("convex-feedback-admin.one.__clerk_client_jwt"),
    ).toBeUndefined();
  });

  it("does not allow a stale runtime to recreate cleared auth state", async () => {
    const staleRuntime = createSecureTokenStorage("removed-project");
    await staleRuntime.setItem("provider-token", "token");
    await clearProjectAuthStorage("removed-project");

    await staleRuntime.setItem("provider-token", "late-token");

    expect(
      secureStore.values.get(
        "convex-feedback-admin.removed-project.provider-token",
      ),
    ).toBeUndefined();
  });

  it("drops invalid saved configuration so the setup screen can recover", async () => {
    secureStore.values.set(
      "invalid-projects",
      JSON.stringify({
        projects: [
          {
            id: "broken",
            name: "Broken",
            convexUrl: "https://wrong.convex.cloud",
            apiNamespace: "feedback..admin",
            auth: {
              provider: "convex-auth",
              publicConfig: {
                methods: { password: true },
                providerIds: { password: "", emailCode: "", sso: {} },
              },
            },
            updatedAt: 1,
          },
        ],
        activeProjectId: "broken",
      }),
    );

    await expect(
      createSecureProjectStore("invalid-projects").load(),
    ).resolves.toEqual({
      projects: [],
      activeProjectId: null,
    });
  });
});
