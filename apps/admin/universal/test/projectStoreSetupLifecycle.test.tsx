import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, test, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  clearAuthStorage: vi.fn(async () => undefined),
  load: vi.fn(),
  save: vi.fn(async () => undefined),
}));

vi.mock("convex-feedback-admin-auth", () => ({
  clearProjectAuthStorage: storeMocks.clearAuthStorage,
  createSecureProjectStore: () => ({
    load: storeMocks.load,
    save: storeMocks.save,
    clear: vi.fn(async () => undefined),
  }),
  normalizeProjectConfig: (project: unknown) => project,
  projectAuthStateRequiresReset: () => false,
  testConvexAdminConnection: vi.fn(async () => ({
    ok: true,
    apiPath: "api.feedback.isAdmin",
    isAdmin: false,
  })),
  validateAdminProjectConfig: vi.fn(() => ({ valid: true, issues: [] })),
  removeProject: (state: any, projectId: string) => {
    const projects = state.projects.filter(
      (project: { id: string }) => project.id !== projectId,
    );
    return {
      projects,
      activeProjectId:
        state.activeProjectId === projectId
          ? (projects[0]?.id ?? null)
          : state.activeProjectId,
    };
  },
  saveProject: (state: any, project: { id: string }) => ({
    projects: state.projects.some(
      (entry: { id: string }) => entry.id === project.id,
    )
      ? state.projects.map((entry: { id: string }) =>
          entry.id === project.id ? project : entry,
        )
      : [...state.projects, project],
    activeProjectId: project.id,
  }),
  selectProject: (state: any, projectId: string) => ({
    ...state,
    activeProjectId: projectId,
  }),
}));

import {
  ProjectStoreProvider,
  useProjectStore,
} from "../components/ProjectStoreContext";
import type { ProjectStoreContextValue } from "../components/ProjectStoreContext";
import {
  ProjectSetupProvider,
  useProjectSetup,
} from "../components/ProjectSetupContext";
import type { ProjectSetupContextValue } from "../components/ProjectSetupContext";
import type { AdminProjectConfig } from "convex-feedback-admin-auth";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let latestStore: ProjectStoreContextValue | undefined;
let latestSetup: ProjectSetupContextValue | undefined;

function StoreProbe() {
  latestStore = useProjectStore();
  return null;
}

function CombinedSetupProbe() {
  latestStore = useProjectStore();
  latestSetup = useProjectSetup();
  return null;
}

const projectA: AdminProjectConfig = {
  id: "project-a",
  name: "Project A",
  convexUrl: "https://a.convex.cloud",
  apiNamespace: "feedback",
  auth: {
    provider: "convex-auth",
    publicConfig: {
      methods: { password: true, emailCode: false, sso: [] },
      providerIds: { password: "a-password", emailCode: "", sso: {} },
    },
  },
  updatedAt: 1,
};

const projectB: AdminProjectConfig = {
  ...projectA,
  id: "project-b",
  name: "Project B",
};

async function renderStore(): Promise<ReactTestRenderer> {
  latestStore = undefined;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ProjectStoreProvider>
        <StoreProbe />
      </ProjectStoreProvider>,
    );
    await Promise.resolve();
  });
  return renderer;
}

async function renderCombinedSetup(): Promise<ReactTestRenderer> {
  latestStore = undefined;
  latestSetup = undefined;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ProjectStoreProvider>
        <ProjectSetupProvider
          onCancel={() => latestStore?.cancelSetup()}
          onSave={(project) => latestStore?.completeSetup(project)}
        >
          <CombinedSetupProbe />
        </ProjectSetupProvider>
      </ProjectStoreProvider>,
    );
    await Promise.resolve();
  });
  return renderer;
}

describe("universal project store setup lifecycle", () => {
  beforeEach(() => {
    storeMocks.load.mockReset();
    storeMocks.save.mockReset();
    storeMocks.save.mockResolvedValue(undefined);
    storeMocks.clearAuthStorage.mockReset();
    storeMocks.clearAuthStorage.mockResolvedValue(undefined);
  });

  test("first launch initializes add mode before setup navigation", async () => {
    storeMocks.load.mockResolvedValue({ projects: [], activeProjectId: null });
    const renderer = await renderStore();

    expect(latestStore?.hydrated).toBe(true);
    expect(latestStore?.activeProject).toBeUndefined();
    expect(latestStore?.setupMode).toBe("add");

    await act(async () => {
      renderer.unmount();
    });
  });

  test("edit mode retains the selected project and save/cancel clear setup mode", async () => {
    storeMocks.load.mockResolvedValue({
      projects: [projectA, projectB],
      activeProjectId: projectA.id,
    });
    const renderer = await renderStore();

    await act(async () => {
      expect(latestStore?.startEditProject(projectB.id)).toBe(true);
    });
    expect(latestStore?.setupMode).toBe("edit");
    expect(latestStore?.editingProject).toEqual(projectB);

    await act(async () => {
      await latestStore?.completeSetup({
        ...projectB,
        name: "Project B renamed",
      });
    });
    expect(latestStore?.setupMode).toBeNull();
    expect(latestStore?.editingProject).toBeUndefined();
    expect(latestStore?.activeProject?.id).toBe(projectB.id);

    await act(async () => {
      latestStore?.startAddProject();
      latestStore?.cancelSetup();
    });
    expect(latestStore?.setupMode).toBeNull();
    expect(latestStore?.editingProject).toBeUndefined();

    await act(async () => {
      renderer.unmount();
    });
  });

  test("removing the final project re-enters an explicit add session", async () => {
    storeMocks.load.mockResolvedValue({
      projects: [projectA],
      activeProjectId: projectA.id,
    });
    const renderer = await renderStore();

    await act(async () => {
      await latestStore?.removeProject(projectA.id);
    });
    expect(latestStore?.activeProject).toBeUndefined();
    expect(latestStore?.setupMode).toBe("add");

    await act(async () => {
      renderer.unmount();
    });
  });

  test("the actual setup provider save and cancel exits clear store setup mode", async () => {
    storeMocks.load.mockResolvedValue({ projects: [], activeProjectId: null });
    const renderer = await renderCombinedSetup();

    expect(latestStore?.setupMode).toBe("add");
    await act(async () => {
      latestSetup?.setProjectName("First project");
      latestSetup?.setConvexUrl("https://first.convex.cloud");
      latestSetup?.setApiNamespace("feedback");
    });
    await act(async () => {
      await latestSetup?.save();
    });
    expect(latestStore?.setupMode).toBeNull();
    expect(latestStore?.activeProject?.name).toBe("First project");

    await act(async () => {
      latestStore?.startAddProject();
      latestSetup?.cancel();
    });
    expect(latestStore?.setupMode).toBeNull();

    await act(async () => {
      renderer.unmount();
    });
  });
});
