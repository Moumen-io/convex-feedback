import {
  clearProjectAuthStorage,
  createSecureProjectStore,
  normalizeProjectConfig,
  projectAuthStateRequiresReset,
  removeProject as removeProjectState,
  saveProject as saveProjectState,
  selectProject as selectProjectState,
} from "convex-feedback-admin-auth";
import type {
  AdminProjectConfig,
  AdminProjectStoreState,
} from "convex-feedback-admin-auth";
import type { AdminProjectSummary } from "convex-feedback-admin-app-screens/native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export type ProjectSetupMode = "add" | "edit";

export interface ProjectStoreContextValue {
  hydrated: boolean;
  state: AdminProjectStoreState;
  activeProject?: AdminProjectConfig;
  editingProject?: AdminProjectConfig;
  projects: AdminProjectSummary[];
  setupMode: ProjectSetupMode | null;
  projectManagerOpen: boolean;
  startAddProject: () => void;
  startEditProject: (projectId: string) => boolean;
  cancelSetup: () => void;
  completeSetup: (project: AdminProjectConfig) => Promise<void>;
  openProjectManager: () => void;
  closeProjectManager: () => void;
  selectProject: (projectId: string) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
}

const ProjectStoreContext = createContext<ProjectStoreContextValue | null>(
  null,
);

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createSecureProjectStore(), []);
  const [state, setState] = useState<AdminProjectStoreState>({
    projects: [],
    activeProjectId: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const [setupMode, setSetupMode] = useState<ProjectSetupMode | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    let mounted = true;
    void store
      .load()
      .then((loaded) => {
        if (!mounted) return;
        stateRef.current = loaded;
        setState(loaded);
        // Setup mode is process state, not a property of the current URL.
        // Start a new setup session before the first setup route is entered
        // whenever there is no active project to run.
        setSetupMode(loaded.activeProjectId ? null : "add");
        setEditingProjectId(null);
        setHydrated(true);
      })
      .catch(() => {
        if (!mounted) return;
        const emptyState: AdminProjectStoreState = {
          projects: [],
          activeProjectId: null,
        };
        stateRef.current = emptyState;
        setState(emptyState);
        setSetupMode("add");
        setEditingProjectId(null);
        setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [store]);

  const commit = useCallback(
    async (next: AdminProjectStoreState) => {
      const previous = stateRef.current;
      // Update the mounted runtime before awaiting persistence. This keeps a
      // project switch/removal from leaving the previous auth provider alive.
      stateRef.current = next;
      setState(next);
      try {
        await store.save(next);
      } catch (error) {
        stateRef.current = previous;
        setState(previous);
        throw error;
      }
    },
    [store],
  );

  const startAddProject = useCallback(() => {
    setEditingProjectId(null);
    setSetupMode("add");
    setProjectManagerOpen(false);
  }, []);

  const startEditProject = useCallback((projectId: string) => {
    if (
      !stateRef.current.projects.some((project) => project.id === projectId)
    ) {
      return false;
    }
    setEditingProjectId(projectId);
    setSetupMode("edit");
    setProjectManagerOpen(false);
    return true;
  }, []);

  const cancelSetup = useCallback(() => {
    setSetupMode(null);
    setEditingProjectId(null);
    setProjectManagerOpen(false);
  }, []);

  const completeSetup = useCallback(
    async (project: AdminProjectConfig) => {
      const normalized = normalizeProjectConfig(project);
      const previous = stateRef.current.projects.find(
        (entry) => entry.id === normalized.id,
      );
      if (previous && projectAuthStateRequiresReset(previous, normalized)) {
        await clearProjectAuthStorage(normalized.id);
      }
      await commit(saveProjectState(stateRef.current, normalized));
      setSetupMode(null);
      setEditingProjectId(null);
      setProjectManagerOpen(false);
    },
    [commit],
  );

  const removeProject = useCallback(
    async (projectId: string) => {
      await clearProjectAuthStorage(projectId);
      const wasActive = stateRef.current.activeProjectId === projectId;
      const next = removeProjectState(stateRef.current, projectId);
      await commit(next);
      if (wasActive) setProjectManagerOpen(false);
      if (!next.activeProjectId) {
        setEditingProjectId(null);
        setSetupMode("add");
      }
    },
    [commit],
  );

  const selectProject = useCallback(
    async (projectId: string) => {
      const next = selectProjectState(stateRef.current, projectId);
      if (next === stateRef.current) return;
      await commit(next);
      setProjectManagerOpen(false);
    },
    [commit],
  );

  const activeProject = state.projects.find(
    (project) => project.id === state.activeProjectId,
  );
  const editingProject = state.projects.find(
    (project) => project.id === editingProjectId,
  );
  const projects = useMemo(
    () => state.projects.map(toProjectSummary),
    [state.projects],
  );
  const value = useMemo<ProjectStoreContextValue>(
    () => ({
      hydrated,
      state,
      activeProject,
      editingProject,
      projects,
      setupMode,
      projectManagerOpen,
      startAddProject,
      startEditProject,
      cancelSetup,
      completeSetup,
      openProjectManager: () => setProjectManagerOpen(true),
      closeProjectManager: () => setProjectManagerOpen(false),
      selectProject,
      removeProject,
    }),
    [
      activeProject,
      cancelSetup,
      completeSetup,
      editingProject,
      hydrated,
      projectManagerOpen,
      projects,
      removeProject,
      selectProject,
      setupMode,
      startAddProject,
      startEditProject,
      state,
    ],
  );

  return (
    <ProjectStoreContext.Provider value={value}>
      {children}
    </ProjectStoreContext.Provider>
  );
}

export function useProjectStore(): ProjectStoreContextValue {
  const value = useContext(ProjectStoreContext);
  if (!value) {
    throw new Error(
      "useProjectStore must be used inside the universal project store.",
    );
  }
  return value;
}

function toProjectSummary(project: AdminProjectConfig): AdminProjectSummary {
  return {
    id: project.id,
    name: project.name,
    convexUrl: project.convexUrl,
    apiNamespace: project.apiNamespace,
    authProvider: project.auth.provider,
  };
}
