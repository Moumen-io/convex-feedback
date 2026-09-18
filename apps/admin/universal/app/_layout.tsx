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
import { Component, useCallback, useEffect, useMemo, useState } from "react";
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
  const setupRequired = setupMode !== null || !activeProject;
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");

  useEffect(() => {
    if (!hydrated || !setupRequired || isSetupRoute) return;
    const setupHref = "/setup/convex" as Href;
    if (activeProject) router.push(setupHref);
    else router.replace(setupHref);
  }, [activeProject, hydrated, isSetupRoute, router, setupRequired]);

  useEffect(() => {
    if (!hydrated || setupRequired || !isSetupRoute) return;
    router.replace("/inbox" as Href);
  }, [hydrated, isSetupRoute, router, setupRequired]);

  if (!hydrated) return <LoadingScreen label="Loading saved projects…" />;

  if (setupRequired) {
    if (!isSetupRoute) {
      return <LoadingScreen label="Opening project setup…" />;
    }
    return <SetupRouteNavigator theme={theme} />;
  }

  if (isSetupRoute) {
    return <LoadingScreen label="Opening the admin app…" />;
  }

  if (projectManagerOpen && activeProject) {
    return (
      <ProjectManagerScreen
        activeProjectId={activeProject.id}
        onAddProject={projectStore.startAddProject}
        onClose={projectStore.closeProjectManager}
        onEditProject={projectStore.startEditProject}
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
    onAddProject: projectStore.startAddProject,
    onEditProject: projectStore.startEditProject,
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
      />
    </ProjectRuntimeErrorBoundary>
  );
}

function SetupRouteNavigator({ theme }: { theme: AdminTheme }) {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="setup" options={{ headerShown: false }} />
    </Stack>
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
