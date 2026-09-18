import { describe, expect, test } from "vitest";

import {
  buildFinalProjectConfig,
  createProjectSetupDraft,
  getConvexAuthProviderIds,
  getAuthMethods,
  updateConvexAuthProviderIds,
  updateProjectAuthMethods,
  updateProjectAuthProvider,
  updateProjectIdentity,
} from "../components/projectSetupState";

const existingProject = {
  id: "project-existing",
  name: "Existing feedback",
  convexUrl: "https://existing.convex.cloud/",
  apiNamespace: "feedback.admin",
  auth: {
    provider: "convex-auth" as const,
    publicConfig: {
      methods: {
        password: false,
        emailCode: true,
        sso: [{ id: "apple", label: "Apple" }],
      },
      providerIds: {
        password: "host-password",
        emailCode: "host-email-code",
        sso: { apple: "oauth-apple" },
      },
    },
  },
  updatedAt: 10,
};

describe("universal project setup draft", () => {
  test("creates a new draft without writing project storage", () => {
    const draft = createProjectSetupDraft(undefined, 123);

    expect(draft).toMatchObject({
      id: "project-3f",
      name: "",
      convexUrl: "",
      apiNamespace: "",
      updatedAt: 123,
    });
    expect(draft.auth).toEqual({
      provider: "convex-auth",
      publicConfig: {
        methods: { password: true, emailCode: false, sso: [] },
        providerIds: { password: "", emailCode: "", sso: {} },
      },
    });
  });

  test("populates an edit draft with the existing provider configuration", () => {
    const draft = createProjectSetupDraft(existingProject);

    expect(draft).toEqual(existingProject);
    expect(draft).not.toBe(existingProject);
    expect(draft.auth).not.toBe(existingProject.auth);
    expect(getAuthMethods(draft.auth)).toEqual(
      existingProject.auth.publicConfig.methods,
    );
    expect(getConvexAuthProviderIds(draft.auth)).toEqual(
      existingProject.auth.publicConfig.providerIds,
    );
  });

  test("retains earlier route decisions while later screens update their fields", () => {
    let draft = createProjectSetupDraft(undefined, 200);
    draft = updateProjectIdentity(draft, {
      name: "Feedback admin",
      convexUrl: "https://admin.convex.cloud/",
      apiNamespace: "api.feedback",
    });
    draft = updateProjectAuthProvider(draft, "convex-auth");
    draft = updateProjectAuthMethods(draft, {
      password: true,
      emailCode: true,
      sso: [{ id: "apple", label: "Apple" }],
    });
    draft = updateConvexAuthProviderIds(draft, {
      password: "password-admin",
      emailCode: "email-admin",
      sso: { apple: "oauth-apple-admin" },
    });

    expect(draft.name).toBe("Feedback admin");
    expect(draft.convexUrl).toBe("https://admin.convex.cloud/");
    expect(draft.apiNamespace).toBe("api.feedback");
    expect(draft.auth).toEqual({
      provider: "convex-auth",
      publicConfig: {
        methods: {
          password: true,
          emailCode: true,
          sso: [{ id: "apple", label: "Apple" }],
        },
        providerIds: {
          password: "password-admin",
          emailCode: "email-admin",
          sso: { apple: "oauth-apple-admin" },
        },
      },
    });
  });

  test("generates the final normalized config without changing the draft", () => {
    let draft = createProjectSetupDraft(existingProject, 300);
    draft = updateProjectIdentity(draft, {
      name: "  Renamed project  ",
      convexUrl: "https://renamed.convex.cloud/",
      apiNamespace: "api.feedback.admin",
    });

    const finalConfig = buildFinalProjectConfig(draft, 400);

    expect(finalConfig).toMatchObject({
      id: "project-existing",
      name: "Renamed project",
      convexUrl: "https://renamed.convex.cloud",
      apiNamespace: "feedback.admin",
      updatedAt: 400,
    });
    expect(finalConfig.auth).toEqual(existingProject.auth);
    expect(draft.name).toBe("  Renamed project  ");
    expect(draft.apiNamespace).toBe("api.feedback.admin");
  });
});
