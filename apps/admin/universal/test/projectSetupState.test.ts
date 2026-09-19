import { describe, expect, test } from "vitest";

import {
  buildFinalProjectConfig,
  createProjectSetupDraft,
  getConnectionKey,
  getConvexAuthProviderIds,
  getAuthMethods,
  getSetupAfterMethodsRoute,
  requiresSsoAppSetup,
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
  test("adds the SSO app setup step for Clerk when an SSO method is enabled", () => {
    const methods = {
      password: true,
      emailCode: false,
      sso: [{ id: "google", label: "Google" }],
    };

    expect(requiresSsoAppSetup("clerk", methods)).toBe(true);
    expect(getSetupAfterMethodsRoute("clerk", methods)).toBe("sso");
  });

  test("skips SSO app setup for Clerk password/email-only configurations", () => {
    const methods = { password: true, emailCode: true, sso: [] };

    expect(requiresSsoAppSetup("clerk", methods)).toBe(false);
    expect(getSetupAfterMethodsRoute("clerk", methods)).toBe("configuration");
  });

  test("removes the SSO app setup step when the last SSO method is disabled", () => {
    const withSso = {
      password: false,
      emailCode: true,
      sso: [{ id: "apple", label: "Apple" }],
    };
    const withoutSso = updateProjectAuthMethods(
      createProjectSetupDraft(undefined, 150),
      { ...withSso, sso: [] },
    );

    expect(requiresSsoAppSetup("clerk", withSso)).toBe(true);
    expect(requiresSsoAppSetup("clerk", getAuthMethods(withoutSso.auth))).toBe(
      false,
    );
    expect(
      getSetupAfterMethodsRoute("clerk", getAuthMethods(withoutSso.auth)),
    ).toBe("configuration");
  });

  test("only adds the Convex Auth app step when native SSO uses its callback allowlist", () => {
    expect(requiresSsoAppSetup("convex-auth", { password: true })).toBe(false);
    expect(
      requiresSsoAppSetup("convex-auth", {
        password: true,
        sso: [{ id: "google", label: "Google" }],
      }),
    ).toBe(true);
  });

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
    expect(draft.apiNamespace).toBe("feedback");
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

  test("normalizes pasted API prefixes without rewriting api-prefixed namespaces", () => {
    const draft = createProjectSetupDraft(undefined, 250);

    expect(
      updateProjectIdentity(draft, { apiNamespace: "feedback" }).apiNamespace,
    ).toBe("feedback");
    expect(
      updateProjectIdentity(draft, { apiNamespace: "api.feedback" })
        .apiNamespace,
    ).toBe("feedback");
    expect(
      updateProjectIdentity(draft, { apiNamespace: "apiary.feedback" })
        .apiNamespace,
    ).toBe("apiary.feedback");
  });

  test("keeps connection keys distinct for similar api-prefixed namespaces", () => {
    const url = "https://admin.convex.cloud/";

    expect(getConnectionKey(url, "feedback")).toBe(
      getConnectionKey(url, "api.feedback"),
    );
    expect(getConnectionKey(url, "apiary.feedback")).toBe(
      "https://admin.convex.cloud\u0000apiary.feedback",
    );
    expect(getConnectionKey(url, "ary.feedback")).toBe(
      "https://admin.convex.cloud\u0000ary.feedback",
    );
    expect(getConnectionKey(url, "apiary.feedback")).not.toBe(
      getConnectionKey(url, "ary.feedback"),
    );
  });

  test("generates the final normalized config while retaining draft-only whitespace", () => {
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
    expect(draft.apiNamespace).toBe("feedback.admin");
  });
});
