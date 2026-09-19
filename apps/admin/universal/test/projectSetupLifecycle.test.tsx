import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { useEffect } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const connectionTest = vi.hoisted(() =>
  vi.fn(async () => ({
    ok: true as const,
    apiPath: "api.feedback.isAdmin",
    isAdmin: false,
  })),
);

const validateProject = vi.hoisted(() =>
  vi.fn(() => ({ valid: true, issues: [] as string[] })),
);

vi.mock("convex-feedback-admin-auth", () => ({
  testConvexAdminConnection: connectionTest,
  validateAdminProjectConfig: validateProject,
}));

import {
  ProjectSetupProvider,
  useProjectSetup,
} from "../components/ProjectSetupContext";
import type { ProjectSetupContextValue } from "../components/ProjectSetupContext";
import type { AdminProjectConfig } from "convex-feedback-admin-auth";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let latestSetup: ProjectSetupContextValue | undefined;
let probeMounts = 0;
let probeUnmounts = 0;

function SetupStackProbe({ route }: { route: string }) {
  const setup = useProjectSetup();
  latestSetup = setup;

  // The route prop stands in for the focused child of the real setup Stack.
  // The effect must run once while the provider remains mounted across route
  // updates.
  void route;
  useEffect(() => {
    probeMounts += 1;
    return () => {
      probeUnmounts += 1;
    };
  }, []);
  return null;
}

const existingProject: AdminProjectConfig = {
  id: "project-existing",
  name: "Existing feedback",
  convexUrl: "https://existing.convex.cloud",
  apiNamespace: "feedback.admin",
  auth: {
    provider: "convex-auth",
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

async function renderSetup({
  initialProject,
  onCancel = vi.fn(),
  onSave = vi.fn(async () => undefined),
  route = "convex",
}: {
  initialProject?: AdminProjectConfig;
  onCancel?: () => void;
  onSave?: (project: AdminProjectConfig) => Promise<void> | void;
  route?: string;
} = {}) {
  latestSetup = undefined;
  probeMounts = 0;
  probeUnmounts = 0;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ProjectSetupProvider
        initialProject={initialProject}
        onCancel={onCancel}
        onSave={onSave}
      >
        <SetupStackProbe route={route} />
      </ProjectSetupProvider>,
    );
  });
  return renderer;
}

describe("universal project setup provider lifecycle", () => {
  beforeEach(() => {
    connectionTest.mockClear();
    validateProject.mockClear();
  });

  test("first launch creates an add draft and keeps values through forward and back navigation", async () => {
    const renderer = await renderSetup();

    await act(async () => {
      latestSetup?.setProjectName("Feedback admin");
      latestSetup?.setConvexUrl("https://admin.convex.cloud/");
      latestSetup?.setApiNamespace("api.feedback");
    });
    expect(latestSetup?.isEditing).toBe(false);
    expect(latestSetup?.draft).toMatchObject({
      name: "Feedback admin",
      convexUrl: "https://admin.convex.cloud/",
      apiNamespace: "feedback",
    });

    await act(async () => {
      renderer.update(
        <ProjectSetupProvider
          onCancel={vi.fn()}
          onSave={vi.fn(async () => undefined)}
        >
          <SetupStackProbe route="provider" />
        </ProjectSetupProvider>,
      );
      latestSetup?.selectProvider("clerk");
    });
    await act(async () => {
      renderer.update(
        <ProjectSetupProvider
          onCancel={vi.fn()}
          onSave={vi.fn(async () => undefined)}
        >
          <SetupStackProbe route="methods" />
        </ProjectSetupProvider>,
      );
      latestSetup?.setEmailCodeEnabled(true);
    });
    await act(async () => {
      renderer.update(
        <ProjectSetupProvider
          onCancel={vi.fn()}
          onSave={vi.fn(async () => undefined)}
        >
          <SetupStackProbe route="configuration" />
        </ProjectSetupProvider>,
      );
      latestSetup?.setPublishableKey("pk_test_123");
    });

    await act(async () => {
      renderer.update(
        <ProjectSetupProvider
          onCancel={vi.fn()}
          onSave={vi.fn(async () => undefined)}
        >
          <SetupStackProbe route="methods" />
        </ProjectSetupProvider>,
      );
    });

    expect(latestSetup?.draft).toMatchObject({
      name: "Feedback admin",
      convexUrl: "https://admin.convex.cloud/",
      apiNamespace: "feedback",
      auth: {
        provider: "clerk",
        publicConfig: {
          methods: { password: true, emailCode: true },
          publishableKey: "pk_test_123",
        },
      },
    });
    expect(probeMounts).toBe(1);
    expect(probeUnmounts).toBe(0);

    await act(async () => {
      renderer.unmount();
    });
  });

  test("edit flow starts with the selected project and retains its prepopulation", async () => {
    const renderer = await renderSetup({ initialProject: existingProject });

    expect(latestSetup?.isEditing).toBe(true);
    expect(latestSetup?.draft).toEqual(existingProject);

    await act(async () => {
      latestSetup?.setProjectName("Renamed feedback");
      renderer.update(
        <ProjectSetupProvider
          initialProject={existingProject}
          onCancel={vi.fn()}
          onSave={vi.fn(async () => undefined)}
        >
          <SetupStackProbe route="provider" />
        </ProjectSetupProvider>,
      );
    });

    expect(latestSetup?.draft.name).toBe("Renamed feedback");
    expect(latestSetup?.draft.id).toBe(existingProject.id);
    expect(latestSetup?.isEditing).toBe(true);
    expect(probeMounts).toBe(1);

    await act(async () => {
      renderer.unmount();
    });
  });

  test("save and cancel call the lifecycle exits after using the actual provider", async () => {
    const savedProjects: AdminProjectConfig[] = [];
    const onSave = vi.fn(async (project: AdminProjectConfig) => {
      savedProjects.push(project);
    });
    const onCancel = vi.fn();
    const renderer = await renderSetup({ onCancel, onSave });

    await act(async () => {
      latestSetup?.setProjectName("Saved project");
      latestSetup?.setConvexUrl("https://saved.convex.cloud");
      latestSetup?.setApiNamespace("feedback");
      latestSetup?.setProviderId("password", "password-provider");
    });

    await act(async () => {
      await latestSetup?.save();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(savedProjects[0]).toMatchObject({
      name: "Saved project",
      convexUrl: "https://saved.convex.cloud",
      apiNamespace: "feedback",
    });

    await act(async () => {
      latestSetup?.cancel();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.unmount();
    });
  });
});
