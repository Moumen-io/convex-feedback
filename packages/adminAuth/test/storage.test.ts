import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    deleteItemAsync: vi.fn((key: string) => {
      values.delete(key);
      return Promise.resolve();
    }),
    getItemAsync: vi.fn((key: string) =>
      Promise.resolve(values.get(key) ?? null),
    ),
    setItemAsync: vi.fn((key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve();
    }),
    reset: () => {
      values.clear();
    },
  };
});

vi.mock("expo-secure-store", () => secureStore);

import {
  clearProjectAuthStorage,
  createSecureAuthMetadataStore,
  createNamespacedClerkTokenCache,
  createSecureProjectStore,
  createSecureTokenStorage,
  getConvexAuthStorageNamespace,
  getProjectAuthMetadataKey,
  getProjectAuthStorageRegistryKey,
} from "../src/storage.js";
import type { AdminAuthLastUsed } from "../src/contracts.js";

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

  it("isolates mixed provider sessions and last-used metadata by project", async () => {
    const projectOneClerk = createNamespacedClerkTokenCache("mixed-one");
    const projectTwoConvex = createSecureTokenStorage("mixed-two");
    const projectOneMetadata = createSecureAuthMetadataStore("mixed-one");
    const projectTwoMetadata = createSecureAuthMetadataStore("mixed-two");

    await projectOneClerk.saveToken("__clerk_client_jwt", "clerk-one");
    await projectTwoConvex.setItem("provider-token", "convex-two");
    await projectOneMetadata.save({
      provider: "clerk",
      instanceIdentity: "clerk-one-instance",
      method: { kind: "sso", id: "google" },
      email: "one@example.com",
    });
    await projectTwoMetadata.save({
      provider: "convex-auth",
      instanceIdentity: "convex-two-instance",
      method: { kind: "password" },
      email: "two@example.com",
    });

    await clearProjectAuthStorage("mixed-one", { clearMetadata: true });

    expect(
      secureStore.values.get(
        "convex-feedback-admin.mixed-two.provider-token",
      ),
    ).toBe("convex-two");
    await expect(projectTwoMetadata.load()).resolves.toEqual({
      provider: "convex-auth",
      instanceIdentity: "convex-two-instance",
      method: { kind: "password" },
      email: "two@example.com",
    });
    expect(
      secureStore.values.get(getProjectAuthMetadataKey("mixed-one")),
    ).toBeUndefined();
    expect(
      secureStore.values.get(getProjectAuthMetadataKey("mixed-two")),
    ).toBeDefined();
  });

  it("stores only last-used method metadata and retains it when sessions are cleared", async () => {
    const metadataStore = createSecureAuthMetadataStore("metadata-project");
    const unsafeMetadata = {
      provider: "clerk",
      instanceIdentity: "clerk-instance",
      method: { kind: "email-code" },
      email: "  admin@example.com  ",
      password: "never-save-this",
      verificationCode: "123456",
    };

    await metadataStore.save(unsafeMetadata as AdminAuthLastUsed);
    const stored = secureStore.values.get(
      getProjectAuthMetadataKey("metadata-project"),
    );
    expect(stored).toBe(
      JSON.stringify({
        provider: "clerk",
        instanceIdentity: "clerk-instance",
        method: { kind: "email-code" },
        email: "admin@example.com",
      }),
    );

    await clearProjectAuthStorage("metadata-project");
    await expect(
      createSecureAuthMetadataStore("metadata-project").load(),
    ).resolves.toEqual({
      provider: "clerk",
      instanceIdentity: "clerk-instance",
      method: { kind: "email-code" },
      email: "admin@example.com",
    });
  });

  it("keeps separate Clerk instances in separate project token caches", async () => {
    const clerkProjectOne = createNamespacedClerkTokenCache("clerk-project-one");
    const clerkProjectTwo = createNamespacedClerkTokenCache("clerk-project-two");

    await clerkProjectOne.saveToken("__clerk_client_jwt", "instance-one");
    await clerkProjectTwo.saveToken("__clerk_client_jwt", "instance-two");
    await clearProjectAuthStorage("clerk-project-one");

    await expect(
      clerkProjectTwo.getToken("__clerk_client_jwt"),
    ).resolves.toBe("instance-two");
    expect(
      secureStore.values.get(
        "convex-feedback-admin.clerk-project-one.__clerk_client_jwt",
      ),
    ).toBeUndefined();
  });

  it("keeps project IDs isolated when SecureStore sanitization would collide", async () => {
    expect(getProjectAuthStorageRegistryKey("team/a")).not.toBe(
      getProjectAuthStorageRegistryKey("team_a"),
    );
    expect(getProjectAuthMetadataKey("team/a")).not.toBe(
      getProjectAuthMetadataKey("team_a"),
    );

    const slashProject = createSecureTokenStorage("team/a");
    const underscoreProject = createSecureTokenStorage("team_a");

    await slashProject.setItem("provider-token", "slash-token");
    await underscoreProject.setItem("provider-token", "underscore-token");

    await expect(slashProject.getItem("provider-token")).resolves.toBe(
      "slash-token",
    );
    await expect(underscoreProject.getItem("provider-token")).resolves.toBe(
      "underscore-token",
    );

    await clearProjectAuthStorage("team/a");

    await expect(underscoreProject.getItem("provider-token")).resolves.toBe(
      "underscore-token",
    );
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

  it("returns validated projects when a repair write fails", async () => {
    const raw = JSON.stringify({
      projects: [
        {
          id: "repairable",
          name: " Repairable project ",
          convexUrl: "https://example.convex.cloud/",
          apiNamespace: "api.feedback",
          auth: {
            provider: "convex-auth",
            publicConfig: {
              methods: { password: true },
              providerIds: {
                password: "host-password",
                emailCode: "",
                sso: {},
              },
            },
          },
          updatedAt: 1,
        },
      ],
      activeProjectId: "repairable",
    });
    secureStore.values.set("repairable-projects", raw);
    secureStore.setItemAsync.mockRejectedValueOnce(
      new Error("SecureStore is temporarily unavailable"),
    );

    await expect(
      createSecureProjectStore("repairable-projects").load(),
    ).resolves.toEqual({
      projects: [
        {
          id: "repairable",
          name: "Repairable project",
          convexUrl: "https://example.convex.cloud",
          apiNamespace: "feedback",
          auth: {
            provider: "convex-auth",
            publicConfig: {
              methods: { password: true, emailCode: false, sso: [] },
              providerIds: {
                password: "host-password",
                emailCode: "",
                sso: {},
              },
            },
          },
          updatedAt: 1,
        },
      ],
      activeProjectId: "repairable",
    });
  });
});
