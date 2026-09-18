import {
  createSecureProjectStore,
  clearProjectAuthStorage,
  normalizeProjectConfig,
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
  NativeAppProviders,
  useAdminTheme,
  type AdminTheme,
  type AdminProjectSummary,
} from "convex-feedback-admin-app-screens/native";
import { ConvexReactClient, useQuery_experimental } from "convex/react";
import { NativeStackNavigationOptions, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    let mounted = true;
    void store
      .load()
      .then((loaded) => {
        if (!mounted) return;
        setState(loaded);
        setHydrated(true);
      })
      .catch(() => {
        if (!mounted) return;
        setState({ projects: [], activeProjectId: null });
        setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [store]);

  const persist = useCallback(
    async (next: typeof state) => {
      await store.save(next);
      setState(next);
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
    const previous = state.projects.find((entry) => entry.id === normalized.id);
    if (
      previous &&
      (previous.convexUrl !== normalized.convexUrl ||
        JSON.stringify(previous.auth) !== JSON.stringify(normalized.auth))
    ) {
      await clearProjectAuthStorage(normalized.id);
    }
    const projects = [
      ...state.projects.filter((entry) => entry.id !== normalized.id),
      normalized,
    ];
    await persist({ projects, activeProjectId: normalized.id });
    setSetupMode(null);
    setEditingProjectId(null);
  };

  const removeProject = async (projectId: string) => {
    const projects = state.projects.filter(
      (project) => project.id !== projectId,
    );
    const nextActiveId =
      state.activeProjectId === projectId
        ? (projects[0]?.id ?? null)
        : state.activeProjectId;
    await clearProjectAuthStorage(projectId);
    await persist({ projects, activeProjectId: nextActiveId });
    if (!nextActiveId) setSetupMode(null);
  };

  const selectProject = async (projectId: string) => {
    await persist({ ...state, activeProjectId: projectId });
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
    <ConfiguredAdminApp
      contextValue={contextValue}
      key={`${activeProject.id}:${activeProject.updatedAt}`}
      project={activeProject}
    />
  );
}

function ConfiguredAdminApp({
  project,
  contextValue,
}: {
  project: AdminProjectConfig;
  contextValue: UniversalAdminContextValue;
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
          <RuntimeGate project={project} />
        </AdminAuthRuntime>
      </RuntimeContextProvider>
    </AdminFeedbackHooksProvider>
  );
}

function RuntimeGate({ project }: { project: AdminProjectConfig }) {
  const auth = useAdminAuth();
  if (!auth.isLoaded || auth.status === "loading") {
    return <LoadingScreen label="Connecting to the project…" />;
  }
  if (!auth.isAuthenticated) {
    return <AdminAuthScreen auth={auth} projectName={project.name} />;
  }
  return <AdminAccessCheck project={project} />;
}

function AdminAccessCheck({ project }: { project: AdminProjectConfig }) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const auth = useAdminAuth();
  const [retryCount, setRetryCount] = useState(0);
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
      { text: "Retry", onPress: () => setRetryCount((value) => value + 1) },
    ]);
  }, [errorMessage]);

  if (accessCheck.status === "pending")
    return <LoadingScreen label="Checking admin access…" />;
  if (accessCheck.status === "error") {
    return (
      <Centered title="Unable to verify access" theme={theme}>
        <Text style={styles.body}>{errorMessage}</Text>
        <Button
          color={theme.primary}
          onPress={() => setRetryCount((value) => value + 1)}
          title="Retry"
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
          onPress={() => void auth.signOut()}
          title="Sign out"
        />
      </Centered>
    );
  }

  return (
    <Stack
      key={retryCount}
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

function toProjectSummary(project: AdminProjectConfig): AdminProjectSummary {
  return {
    id: project.id,
    name: project.name,
    convexUrl: project.convexUrl,
    apiNamespace: project.apiNamespace,
    authProvider: project.auth.provider,
  };
}

function LoadingScreen({ label }: { label: string }) {
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
