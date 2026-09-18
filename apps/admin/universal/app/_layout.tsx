import {
  createSecureProjectStore,
  clearProjectAuthStorage,
  getProjectRuntimeKey,
  normalizeProjectConfig,
  projectAuthStateRequiresReset,
  removeProject as removeProjectState,
  resolveConvexApiNamespace,
  saveProject as saveProjectState,
  selectProject as selectProjectState,
} from "convex-feedback-admin-auth";
import type { AdminProjectConfig } from "convex-feedback-admin-auth";
import {
  AdminAuthRuntime,
  useAdminAuth,
} from "convex-feedback-admin-auth/native";
import { createFeedbackHooks } from "convex-feedback/react";
import {
  AdminAuthScreen,
  AdminFeedbackHooksProvider,
  AdminSettingsScreen,
  NativeAppProviders,
  useAdminTheme,
  type AdminTheme,
  type AdminProjectSummary,
} from "convex-feedback-admin-app-screens/native";
import { ConvexReactClient, useQuery_experimental } from "convex/react";
import { NativeStackNavigationOptions, Stack } from "expo-router";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SetupScreen } from "@/components/SetupScreen";
import {
  RuntimeContextProvider,
  type UniversalAdminContextValue,
} from "@/components/RuntimeContext";

export default function RootLayout() {
  return (
    <NativeAppProviders>
      <UniversalAdminApp />
    </NativeAppProviders>
  );
}

function UniversalAdminApp() {
  const store = useMemo(() => createSecureProjectStore(), []);
  const [state, setState] = useState<{
    projects: AdminProjectConfig[];
    activeProjectId: string | null;
  }>({ projects: [], activeProjectId: null });
  const [hydrated, setHydrated] = useState(false);
  const [setupMode, setSetupMode] = useState<"add" | "edit" | null>(null);
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
        setHydrated(true);
      })
      .catch(() => {
        if (!mounted) return;
        const emptyState = { projects: [], activeProjectId: null };
        stateRef.current = emptyState;
        setState(emptyState);
        setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [store]);

  const commit = useCallback(
    async (next: typeof state) => {
      const previous = stateRef.current;
      // Update the mounted runtime before awaiting persistence. This makes a
      // project switch/removal unmount the previous auth provider immediately.
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

  const activeProject = state.projects.find(
    (project) => project.id === state.activeProjectId,
  );
  const editingProject = state.projects.find(
    (project) => project.id === editingProjectId,
  );

  const saveProject = async (project: AdminProjectConfig) => {
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
  };

  const removeProject = async (projectId: string) => {
    await clearProjectAuthStorage(projectId);
    const wasActive = stateRef.current.activeProjectId === projectId;
    const next = removeProjectState(stateRef.current, projectId);
    await commit(next);
    if (wasActive) setProjectManagerOpen(false);
    if (!next.activeProjectId) setSetupMode(null);
  };

  const selectProject = async (projectId: string) => {
    const next = selectProjectState(stateRef.current, projectId);
    if (next === stateRef.current) return;
    await commit(next);
    setProjectManagerOpen(false);
  };

  if (!hydrated) return <LoadingScreen label="Loading saved projects…" />;

  if (setupMode !== null || !activeProject) {
    return (
      <SetupScreen
        initialProject={setupMode === "edit" ? editingProject : undefined}
        onCancel={
          activeProject
            ? () => {
                setSetupMode(null);
                setEditingProjectId(null);
              }
            : undefined
        }
        onSave={saveProject}
      />
    );
  }

  if (projectManagerOpen) {
    return (
      <ProjectManagerScreen
        activeProjectId={activeProject.id}
        onAddProject={() => {
          setEditingProjectId(null);
          setSetupMode("add");
        }}
        onClose={() => setProjectManagerOpen(false)}
        onEditProject={(projectId) => {
          setEditingProjectId(projectId);
          setSetupMode("edit");
        }}
        onRemoveProject={removeProject}
        onSelectProject={selectProject}
        projects={state.projects.map(toProjectSummary)}
      />
    );
  }

  const projectSummaries = state.projects.map(toProjectSummary);
  const contextValue: UniversalAdminContextValue = {
    project: activeProject,
    projects: projectSummaries,
    onSelectProject: selectProject,
    onAddProject: () => {
      setEditingProjectId(null);
      setSetupMode("add");
    },
    onEditProject: (projectId) => {
      setEditingProjectId(projectId);
      setSetupMode("edit");
    },
    onRemoveProject: removeProject,
  };

  return (
    <ProjectRuntimeErrorBoundary
      key={getProjectRuntimeKey(activeProject)}
      onManageProjects={() => setProjectManagerOpen(true)}
    >
      <ConfiguredAdminApp
        contextValue={contextValue}
        key={getProjectRuntimeKey(activeProject)}
        onManageProjects={() => setProjectManagerOpen(true)}
        project={activeProject}
      />
    </ProjectRuntimeErrorBoundary>
  );
}

function ConfiguredAdminApp({
  project,
  contextValue,
  onManageProjects,
}: {
  project: AdminProjectConfig;
  contextValue: UniversalAdminContextValue;
  onManageProjects: () => void;
}) {
  const client = useMemo(
    () => new ConvexReactClient(project.convexUrl),
    [project],
  );
  const feedbackApi = useMemo(
    () => resolveConvexApiNamespace(project.apiNamespace),
    [project.apiNamespace],
  );
  const feedbackHooks = useMemo(
    () => createFeedbackHooks(feedbackApi),
    [feedbackApi],
  );

  useEffect(() => {
    return () => {
      void client.close();
    };
  }, [client]);

  return (
    <AdminFeedbackHooksProvider hooks={feedbackHooks}>
      <RuntimeContextProvider value={contextValue}>
        <AdminAuthRuntime client={client} project={project}>
          <RuntimeGate onManageProjects={onManageProjects} project={project} />
        </AdminAuthRuntime>
      </RuntimeContextProvider>
    </AdminFeedbackHooksProvider>
  );
}

function RuntimeGate({
  project,
  onManageProjects,
}: {
  project: AdminProjectConfig;
  onManageProjects: () => void;
}) {
  const auth = useAdminAuth();
  const [accessCheckAttempt, setAccessCheckAttempt] = useState(0);
  const retryAccessCheck = useCallback(
    () => setAccessCheckAttempt((value) => value + 1),
    [],
  );
  if (!auth.isLoaded || auth.status === "loading") {
    return (
      <LoadingScreen
        label="Connecting to the project…"
        onManageProjects={onManageProjects}
      />
    );
  }
  if (!auth.isAuthenticated) {
    return (
      <AdminAuthScreen
        auth={auth}
        onCancel={onManageProjects}
        projectName={project.name}
      />
    );
  }
  return (
    <AdminAccessCheck
      key={accessCheckAttempt}
      onManageProjects={onManageProjects}
      onRetry={retryAccessCheck}
      project={project}
    />
  );
}

function AdminAccessCheck({
  project,
  onManageProjects,
  onRetry,
}: {
  project: AdminProjectConfig;
  onManageProjects: () => void;
  onRetry: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const auth = useAdminAuth();
  const adminQuery = useMemo(
    () => resolveConvexApiNamespace(project.apiNamespace).isAdmin,
    [project.apiNamespace],
  );
  const accessCheck = useQuery_experimental({ query: adminQuery, args: {} });
  const errorMessage =
    accessCheck.status === "error" ? accessCheck.error.message : undefined;

  useEffect(() => {
    if (!errorMessage) return;
    Alert.alert("Unable to verify access", errorMessage, [
      { text: "Cancel", style: "cancel" },
      { text: "Retry", onPress: onRetry },
    ]);
  }, [errorMessage, onRetry]);

  if (accessCheck.status === "pending")
    return (
      <LoadingScreen
        label="Checking admin access…"
        onManageProjects={onManageProjects}
      />
    );
  if (accessCheck.status === "error") {
    return (
      <Centered title="Unable to verify access" theme={theme}>
        <Text style={styles.body}>{errorMessage}</Text>
        <Button color={theme.primary} onPress={onRetry} title="Retry" />
        <Button
          color={theme.primary}
          onPress={onManageProjects}
          title="Manage projects"
        />
        <Button
          color={theme.primary}
          onPress={() => void auth.signOut()}
          title="Sign out"
        />
      </Centered>
    );
  }
  if (!accessCheck.data) {
    return (
      <Centered title="Admin access required" theme={theme}>
        <Text style={styles.body}>
          Your account is authenticated, but the host actor resolver did not
          grant admin access.
        </Text>
        <Button
          color={theme.primary}
          onPress={onManageProjects}
          title="Manage projects"
        />
        <Button
          color={theme.primary}
          onPress={() => void auth.signOut()}
          title="Sign out"
        />
      </Centered>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="feedback/[entryId]/index"
        options={modalScreenOptions("Feedback", theme)}
      />
      <Stack.Screen
        name="feedback/new"
        options={modalScreenOptions("New feedback", theme)}
      />
      <Stack.Screen
        name="feedback/[entryId]/edit"
        options={modalScreenOptions("Edit feedback", theme)}
      />
      <Stack.Screen
        name="roadmap/new"
        options={modalScreenOptions("New roadmap item", theme)}
      />
      <Stack.Screen
        name="roadmap/[roadmapId]/index"
        options={modalScreenOptions("Roadmap item", theme)}
      />
      <Stack.Screen
        name="roadmap/[roadmapId]/edit"
        options={modalScreenOptions("Edit roadmap item", theme)}
      />
    </Stack>
  );
}

interface ProjectManagerScreenProps {
  activeProjectId: string;
  projects: AdminProjectSummary[];
  onClose: () => void;
  onSelectProject: (projectId: string) => Promise<void> | void;
  onAddProject: () => void;
  onEditProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => Promise<void> | void;
}

function ProjectManagerScreen({
  activeProjectId,
  projects,
  onClose,
  onSelectProject,
  onAddProject,
  onEditProject,
  onRemoveProject,
}: ProjectManagerScreenProps) {
  const theme = useAdminTheme();
  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.background,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>
          Project access
        </Text>
        <Button color={theme.primary} onPress={onClose} title="Done" />
      </View>
      <AdminSettingsScreen
        activeProjectId={activeProjectId}
        onAddProject={onAddProject}
        onEditProject={onEditProject}
        onRemoveProject={(projectId) => void onRemoveProject(projectId)}
        onSelectProject={(projectId) => void onSelectProject(projectId)}
        projects={projects}
      />
    </View>
  );
}

interface ProjectRuntimeErrorBoundaryProps {
  children: React.ReactNode;
  onManageProjects: () => void;
}

interface ProjectRuntimeErrorBoundaryState {
  error: Error | null;
}

class ProjectRuntimeErrorBoundary extends Component<
  ProjectRuntimeErrorBoundaryProps,
  ProjectRuntimeErrorBoundaryState
> {
  state: ProjectRuntimeErrorBoundaryState = { error: null };

  static getDerivedStateFromError(
    error: unknown,
  ): ProjectRuntimeErrorBoundaryState {
    return {
      error:
        error instanceof Error
          ? error
          : new Error("The project runtime could not be started."),
    };
  }

  render() {
    if (this.state.error) {
      return (
        <ProjectRuntimeErrorScreen
          error={this.state.error}
          onManageProjects={this.props.onManageProjects}
        />
      );
    }
    return this.props.children;
  }
}

function ProjectRuntimeErrorScreen({
  error,
  onManageProjects,
}: {
  error: Error;
  onManageProjects: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  return (
    <Centered title="Project configuration failed" theme={theme}>
      <Text style={styles.body}>{error.message}</Text>
      <Button
        color={theme.primary}
        onPress={onManageProjects}
        title="Manage projects"
      />
    </Centered>
  );
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

function LoadingScreen({
  label,
  onManageProjects,
}: {
  label: string;
  onManageProjects?: () => void;
}) {
  const theme = useAdminTheme();
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.background,
        flex: 1,
        gap: 13,
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={theme.primary} />
      <Text style={{ color: theme.muted, fontSize: 14 }}>{label}</Text>
      {onManageProjects && (
        <Button
          color={theme.primary}
          onPress={onManageProjects}
          title="Manage projects"
        />
      )}
    </View>
  );
}

function Centered({
  children,
  title,
  theme,
}: {
  children: React.ReactNode;
  title: string;
  theme: AdminTheme;
}) {
  const styles = createStyles(theme);
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function modalScreenOptions(
  title: string,
  theme: AdminTheme,
): NativeStackNavigationOptions {
  const isIos = Platform.OS === "ios";
  return {
    title,
    presentation: isIos ? "formSheet" : "modal",
    headerShown: true,
    headerTransparent: true,
    headerBackVisible: false,
    headerTintColor: theme.text,
    headerTitleStyle: { color: theme.text },
    contentStyle: { backgroundColor: theme.background },
    sheetAllowedDetents: [0.65, 1],
    sheetGrabberVisible: true,
  };
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    centered: {
      alignItems: "center",
      backgroundColor: theme.background,
      flex: 1,
      gap: 14,
      justifyContent: "center",
      padding: 28,
    },
    title: {
      color: theme.text,
      fontSize: 21,
      fontWeight: "700",
      textAlign: "center",
    },
    body: {
      color: theme.muted,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 350,
      textAlign: "center",
    },
  });
}
