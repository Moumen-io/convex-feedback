import { describe, expect, it } from "vitest";

import {
  getProjectRuntimeKey,
  projectAuthStateRequiresReset,
  removeProject,
  saveProject,
  selectProject,
} from "../src/lifecycle.js";
import type { AdminProjectConfig } from "../src/contracts.js";
import type { AdminProjectStoreState } from "../src/storage.js";

function project(
  id: string,
  overrides: Partial<AdminProjectConfig> = {},
): AdminProjectConfig {
  return {
    id,
    name: id,
    convexUrl: "https://example.convex.cloud",
    apiNamespace: "feedback",
    auth: {
      provider: "convex-auth",
      publicConfig: {
        methods: { password: true },
        providerIds: { password: "password", emailCode: "", sso: {} },
      },
    },
    updatedAt: 1,
    ...overrides,
  };
}

const initialState: AdminProjectStoreState = {
  projects: [project("one"), project("two")],
  activeProjectId: "one",
};

describe("project lifecycle", () => {
  it("switches only to a configured project and preserves the project list", () => {
    expect(selectProject(initialState, "two")).toEqual({
      ...initialState,
      activeProjectId: "two",
    });
    expect(selectProject(initialState, "missing")).toBe(initialState);
  });

  it("removes the active project and selects the next available project", () => {
    expect(removeProject(initialState, "one")).toEqual({
      projects: [project("two")],
      activeProjectId: "two",
    });
    expect(removeProject(initialState, "two")).toEqual({
      projects: [project("one")],
      activeProjectId: "one",
    });
  });

  it("preserves edit position and activates the edited project", () => {
    const edited = project("two", { name: "Edited", updatedAt: 2 });
    expect(saveProject(initialState, edited)).toEqual({
      projects: [project("one"), edited],
      activeProjectId: "two",
    });
  });

  it("resets auth for deployment, namespace, or provider changes", () => {
    const current = project("one");
    expect(
      projectAuthStateRequiresReset(current, {
        ...current,
        name: "Renamed",
      }),
    ).toBe(false);
    expect(
      projectAuthStateRequiresReset(current, {
        ...current,
        convexUrl: "https://another.convex.cloud",
      }),
    ).toBe(true);
    expect(
      projectAuthStateRequiresReset(current, {
        ...current,
        apiNamespace: "feedback.admin",
      }),
    ).toBe(true);
    expect(
      projectAuthStateRequiresReset(current, {
        ...current,
        auth: {
          provider: "clerk",
          publicConfig: {
            publishableKey: "pk_test_public",
            methods: { password: true },
          },
        },
      }),
    ).toBe(true);
  });

  it("changes the runtime key when relevant configuration changes", () => {
    const current = project("one");
    expect(getProjectRuntimeKey(current)).not.toBe(
      getProjectRuntimeKey({ ...current, apiNamespace: "feedback.admin" }),
    );
    expect(getProjectRuntimeKey(current)).not.toBe(
      getProjectRuntimeKey({ ...current, updatedAt: 2 }),
    );
  });
});
