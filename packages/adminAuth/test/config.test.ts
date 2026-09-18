import { describe, expect, it } from "vitest";

import {
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
