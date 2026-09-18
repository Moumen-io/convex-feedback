import { describe, expect, it } from "vitest";

import {
  isValidConvexUrl,
  normalizeApiNamespace,
  normalizeSsoMethods,
  validateAdminProjectConfig,
} from "../src/config.js";

const baseProject = {
  id: "project-1",
  name: "Feedback",
  convexUrl: "https://example.convex.cloud/",
  apiNamespace: "api.feedback",
  updatedAt: 1,
} as const;

describe("runtime admin configuration", () => {
  it("normalizes the api. prefix", () => {
    expect(normalizeApiNamespace("api.feedback.admin")).toBe("feedback.admin");
  });

  it("accepts deployment roots and rejects URL components Convex cannot use", () => {
    expect(isValidConvexUrl("https://example.convex.cloud/")).toBe(true);
    expect(isValidConvexUrl("http://localhost:3210")).toBe(true);
    expect(isValidConvexUrl("https://example.convex.cloud/convex")).toBe(false);
    expect(isValidConvexUrl("https://example.convex.cloud?project=admin")).toBe(
      false,
    );
    expect(isValidConvexUrl("https://user:password@example.convex.cloud")).toBe(
      false,
    );
  });

  it("keeps Apple first and removes duplicate SSO methods", () => {
    expect(
      normalizeSsoMethods([
        { id: "google", label: "Google" },
        { id: "apple", label: "Apple" },
        { id: "apple", label: "Apple again" },
      ]),
    ).toEqual([
      { id: "apple", label: "Apple" },
      { id: "google", label: "Google" },
    ]);
  });

  it("accepts public Clerk configuration", () => {
    expect(
      validateAdminProjectConfig({
        ...baseProject,
        auth: {
          provider: "clerk",
          publicConfig: {
            publishableKey: "pk_test_public",
            methods: { password: true, sso: [{ id: "apple", label: "Apple" }] },
          },
        },
      }).valid,
    ).toBe(true);
  });

  it("requires the host's actual Convex Auth provider IDs", () => {
    const valid = validateAdminProjectConfig({
      ...baseProject,
      auth: {
        provider: "convex-auth",
        publicConfig: {
          methods: {
            password: true,
            emailCode: true,
            sso: [{ id: "google", label: "Google" }],
          },
          providerIds: {
            password: "password-for-admins",
            emailCode: "magic-email-code",
            sso: { google: "oauth-google-host" },
          },
        },
      },
    });
    expect(valid.valid).toBe(true);

    const missing = validateAdminProjectConfig({
      ...baseProject,
      auth: {
        provider: "convex-auth",
        publicConfig: {
          methods: {
            emailCode: true,
            sso: [{ id: "google", label: "Google" }],
          },
          providerIds: { password: "", emailCode: "", sso: {} },
        },
      },
    });
    expect(missing.valid).toBe(false);
    expect(missing.issues.join(" ")).toContain("email-code");
    expect(missing.issues.join(" ")).toContain("Google");
  });

  it("rejects server-side secrets and placeholder adapters", () => {
    const secretResult = validateAdminProjectConfig({
      ...baseProject,
      auth: {
        provider: "clerk",
        publicConfig: {
          publishableKey: "pk_test_public",
          methods: { password: true },
          // @ts-expect-error Deliberately verifies runtime secret rejection.
          clientSecret: "sk_live_never_store_this",
        },
      },
    });
    expect(secretResult.valid).toBe(false);
    expect(secretResult.issues.join(" ")).toContain("public");

    const placeholderResult = validateAdminProjectConfig({
      ...baseProject,
      auth: { provider: "auth0", publicConfig: { methods: { sso: [] } } },
    });
    expect(placeholderResult.valid).toBe(false);
    expect(placeholderResult.issues.join(" ")).toContain("future adapter");
  });
});
