import {
  getProjectRuntimeKey,
  resolveConvexApiNamespace,
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
import { Stack, usePathname, useRouter } from "expo-router";
import type { Href, NativeStackNavigationOptions } from "expo-router";
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

import {
  ProjectStoreProvider,
  useProjectStore,
} from "@/components/ProjectStoreContext";
import {
  RuntimeContextProvider,
  type UniversalAdminContextValue,
} from "@/components/RuntimeContext";

function projectSetupHref(mode: "add" | "edit", projectId?: string): Href {
  return {
    pathname: "/setup/convex",
    params: {
      mode,
      ...(projectId ? { projectId } : {}),
    },
  } as Href;
}

export default function RootLayout() {
  return (
    <NativeAppProviders>
      <ProjectStoreProvider>
        <UniversalAdminApp />
      </ProjectStoreProvider>
    </NativeAppProviders>
  );
}

function UniversalAdminApp() {
  const projectStore = useProjectStore();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAdminTheme();
  const { activeProject, hydrated, projectManagerOpen, projects, setupMode } =
    projectStore;
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");
  // Keep the setup route authoritative while the setup flow is mounted. This
  // prevents a transient project-store update or navigator remount from
  // falling back into the configured runtime/auth screen mid-flow.
  const setupRequired = setupMode !== null || !activeProject || isSetupRoute;

  const beginAddProject = useCallback(() => {
    projectStore.startAddProject();
  }, [projectStore]);

  const beginEditProject = useCallback(
    (projectId: string) => {
      if (!projectStore.startEditProject(projectId)) return;
    },
    [projectStore],
  );

  useEffect(() => {
    // The project store owns setup lifecycle state. The URL is only the
    // destination (and may carry a recovery hint); it must not decide whether
    // this is an add or edit session.
    if (!hydrated || !setupRequired || isSetupRoute || setupMode === null) {
      return;
    }
    router.replace(
      projectSetupHref(setupMode, projectStore.editingProject?.id),
    );
  }, [hydrated, isSetupRoute, projectStore.editingProject, router, setupMode]);

  if (!hydrated) return <LoadingScreen label="Loading saved projects…" />;

  if (!activeProject) {
    return <SetupRouteNavigator theme={theme} />;
  }

  if (projectManagerOpen && setupMode === null && !isSetupRoute) {
    return (
      <ProjectManagerScreen
        activeProjectId={activeProject.id}
        onAddProject={beginAddProject}
        onClose={projectStore.closeProjectManager}
        onEditProject={beginEditProject}
        onRemoveProject={projectStore.removeProject}
        onSelectProject={projectStore.selectProject}
        projects={projects}
      />
    );
  }

  const contextValue: UniversalAdminContextValue = {
    project: activeProject,
    projects,
    onSelectProject: projectStore.selectProject,
    onAddProject: beginAddProject,
    onEditProject: beginEditProject,
    onRemoveProject: projectStore.removeProject,
  };

  return (
    <ProjectRuntimeErrorBoundary
      key={getProjectRuntimeKey(activeProject)}
      onManageProjects={projectStore.openProjectManager}
    >
      <ConfiguredAdminApp
        contextValue={contextValue}
        key={getProjectRuntimeKey(activeProject)}
        onManageProjects={projectStore.openProjectManager}
        project={activeProject}
        showSetup={setupRequired}
        theme={theme}
      />
    </ProjectRuntimeErrorBoundary>
  );
}

function SetupRouteNavigator({
  includeAdminRoutes = false,
  theme,
}: {
  includeAdminRoutes?: boolean;
  theme: AdminTheme;
}) {
  return (
    <Stack
      initialRouteName={includeAdminRoutes ? "index" : "setup"}
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      {includeAdminRoutes
        ? [
            <Stack.Screen
              key="index"
              name="index"
              options={{ headerShown: false }}
            />,
            <Stack.Screen
              key="(tabs)"
              name="(tabs)"
              options={{ headerShown: false }}
            />,
            <Stack.Screen
              key="feedback/[entryId]/index"
              name="feedback/[entryId]/index"
              options={modalScreenOptions("Feedback", theme)}
            />,
            <Stack.Screen
              key="feedback/new"
              name="feedback/new"
              options={modalScreenOptions("New feedback", theme)}
            />,
            <Stack.Screen
              key="feedback/[entryId]/edit"
              name="feedback/[entryId]/edit"
              options={modalScreenOptions("Edit feedback", theme)}
            />,
            <Stack.Screen
              key="roadmap/new"
              name="roadmap/new"
              options={modalScreenOptions("New roadmap item", theme)}
            />,
            <Stack.Screen
              key="roadmap/[roadmapId]/index"
              name="roadmap/[roadmapId]/index"
              options={modalScreenOptions("Roadmap item", theme)}
            />,
            <Stack.Screen
              key="roadmap/[roadmapId]/edit"
              name="roadmap/[roadmapId]/edit"
              options={modalScreenOptions("Edit roadmap item", theme)}
            />,
          ]
        : null}
    </Stack>
  );
}

function ConfiguredAdminApp({
  project,
  contextValue,
  onManageProjects,
  showSetup,
  theme,
}: {
  project: AdminProjectConfig;
  contextValue: UniversalAdminContextValue;
  onManageProjects: () => void;
  showSetup: boolean;
  theme: AdminTheme;
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

  const clientLifecycles = useRef(
    new Map<
      ConvexReactClient,
      {
        active: boolean;
        closeTimer?: ReturnType<typeof setTimeout>;
      }
    >(),
  );

  useEffect(() => {
    // Convex's auth providers also perform cleanup when this runtime is
    // removed. Defer closing the client until those passive cleanup effects
    // have run; closing it synchronously here makes their clearAuth/query
    // cleanup race a client that has already been marked closed.
    const lifecycle = clientLifecycles.current.get(client) ?? {
      active: false,
    };
    lifecycle.active = true;
    if (lifecycle.closeTimer !== undefined) {
      clearTimeout(lifecycle.closeTimer);
      lifecycle.closeTimer = undefined;
    }
    clientLifecycles.current.set(client, lifecycle);

    return () => {
      lifecycle.active = false;
      lifecycle.closeTimer = setTimeout(() => {
        if (lifecycle.active) return;
        clientLifecycles.current.delete(client);
        void client.close();
      }, 0);
    };
  }, [client]);

  return (
    <AdminFeedbackHooksProvider hooks={feedbackHooks}>
      <RuntimeContextProvider value={contextValue}>
        <AdminAuthRuntime client={client} project={project}>
          {showSetup ? (
            <SetupRouteNavigator includeAdminRoutes theme={theme} />
          ) : (
            <RuntimeGate
              onManageProjects={onManageProjects}
              project={project}
            />
          )}
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

  return <SetupRouteNavigator includeAdminRoutes theme={theme} />;
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
