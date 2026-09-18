import {
  testConvexAdminConnection,
  validateAdminProjectConfig,
} from "convex-feedback-admin-auth";
import type {
  AdminAuthMethods,
  AdminProjectConfig,
  AdminSsoMethod,
  ConvexAdminConnectionResult,
  ConvexAuthProviderIds,
} from "convex-feedback-admin-auth";
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

import {
  buildFinalProjectConfig,
  cloneAuthConfig,
  createProjectSetupDraft,
  getAuthMethods,
  getClerkPublishableKey,
  getConvexAuthProviderIds,
  getConvexSetupIssues,
  getSignInMethodIssues,
  updateClerkPublishableKey,
  updateConvexAuthProviderIds,
  updateProjectAuthMethods,
  updateProjectAuthProvider,
  updateProjectIdentity,
  type SetupSupportedProvider,
} from "./projectSetupState";

export type ConnectionTestState =
  | { key: string; status: "testing" }
  | { key: string; status: "success"; isAdmin: boolean }
  | { key: string; status: "error"; message: string };

export interface ProjectSetupContextValue {
  draft: AdminProjectConfig;
  provider: SetupSupportedProvider;
  methods: AdminAuthMethods;
  providerIds: ConvexAuthProviderIds;
  publishableKey: string;
  connectionKey: string;
  connectionTest: ConnectionTestState | null;
  issues: string[];
  saving: boolean;
  isEditing: boolean;
  canCancel: boolean;
  cancel: () => void;
  setProjectName: (name: string) => void;
  setConvexUrl: (convexUrl: string) => void;
  setApiNamespace: (apiNamespace: string) => void;
  selectProvider: (provider: SetupSupportedProvider) => void;
  setPasswordEnabled: (enabled: boolean) => void;
  setEmailCodeEnabled: (enabled: boolean) => void;
  toggleSsoMethod: (method: AdminSsoMethod) => void;
  setPublishableKey: (publishableKey: string) => void;
  setProviderId: (key: "password" | "emailCode", value: string) => void;
  setSsoProviderId: (methodId: string, value: string) => void;
  validateConvexFields: () => boolean;
  validateSignInMethods: () => boolean;
  testConnection: () => Promise<ConvexAdminConnectionResult>;
  save: () => Promise<boolean>;
}

interface ProjectSetupProviderProps {
  initialProject?: AdminProjectConfig;
  onSave: (project: AdminProjectConfig) => Promise<void> | void;
  onCancel?: () => void;
  children: ReactNode;
}

const ProjectSetupContext = createContext<ProjectSetupContextValue | null>(
  null,
);

export function ProjectSetupProvider({
  initialProject,
  onSave,
  onCancel,
  children,
}: ProjectSetupProviderProps) {
  const initialKey = initialProject?.id ?? "new-project";
  const [draft, setDraft] = useState(() =>
    createProjectSetupDraft(initialProject),
  );
  const initializedKeyRef = useRef(initialKey);
  const providerDraftsRef = useRef<
    Partial<Record<SetupSupportedProvider, AdminProjectConfig["auth"]>>
  >(
    initialProject && isSupportedProvider(initialProject.auth.provider)
      ? { [initialProject.auth.provider]: cloneAuthConfig(initialProject.auth) }
      : {},
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const connectionKey = getConnectionKey(draft.convexUrl, draft.apiNamespace);
  const connectionKeyRef = useRef(connectionKey);
  const [connectionTest, setConnectionTest] =
    useState<ConnectionTestState | null>(null);

  useEffect(() => {
    if (initializedKeyRef.current === initialKey) return;
    initializedKeyRef.current = initialKey;
    const nextDraft = createProjectSetupDraft(initialProject);
    setDraft(nextDraft);
    providerDraftsRef.current = isSupportedProvider(nextDraft.auth.provider)
      ? { [nextDraft.auth.provider]: cloneAuthConfig(nextDraft.auth) }
      : {};
    setIssues([]);
    setConnectionTest(null);
  }, [initialKey, initialProject]);

  useEffect(() => {
    connectionKeyRef.current = connectionKey;
    setConnectionTest((current) =>
      current?.key === connectionKey ? current : null,
    );
  }, [connectionKey]);

  useEffect(() => {
    if (!isSupportedProvider(draft.auth.provider)) return;
    providerDraftsRef.current[draft.auth.provider] = cloneAuthConfig(
      draft.auth,
    );
  }, [draft.auth]);

  const provider = isSupportedProvider(draft.auth.provider)
    ? draft.auth.provider
    : "convex-auth";
  const methods = useMemo(() => getAuthMethods(draft.auth), [draft.auth]);
  const providerIds = useMemo(
    () => getConvexAuthProviderIds(draft.auth),
    [draft.auth],
  );
  const publishableKey = getClerkPublishableKey(draft.auth);

  const setProjectName = useCallback(
    (name: string) =>
      setDraft((current) => updateProjectIdentity(current, { name })),
    [],
  );
  const setConvexUrl = useCallback(
    (convexUrl: string) =>
      setDraft((current) => updateProjectIdentity(current, { convexUrl })),
    [],
  );
  const setApiNamespace = useCallback(
    (apiNamespace: string) =>
      setDraft((current) => updateProjectIdentity(current, { apiNamespace })),
    [],
  );

  const selectProvider = useCallback((nextProvider: SetupSupportedProvider) => {
    setDraft((current) => {
      if (current.auth.provider === nextProvider) return current;
      if (isSupportedProvider(current.auth.provider)) {
        providerDraftsRef.current[current.auth.provider] = cloneAuthConfig(
          current.auth,
        );
      }
      const cached = providerDraftsRef.current[nextProvider];
      const next = cached
        ? {
            ...current,
            auth: replaceAuthMethods(cached, getAuthMethods(current.auth)),
          }
        : updateProjectAuthProvider(current, nextProvider);
      return next;
    });
    setIssues([]);
  }, []);

  const setMethods = useCallback((nextMethods: AdminAuthMethods) => {
    setDraft((current) => updateProjectAuthMethods(current, nextMethods));
    setIssues([]);
  }, []);

  const setPasswordEnabled = useCallback(
    (enabled: boolean) => setMethods({ ...methods, password: enabled }),
    [methods, setMethods],
  );
  const setEmailCodeEnabled = useCallback(
    (enabled: boolean) => setMethods({ ...methods, emailCode: enabled }),
    [methods, setMethods],
  );
  const toggleSsoMethod = useCallback(
    (method: AdminSsoMethod) => {
      const currentSso = methods.sso ?? [];
      const exists = currentSso.some((entry) => entry.id === method.id);
      setMethods({
        ...methods,
        sso: exists
          ? currentSso.filter((entry) => entry.id !== method.id)
          : [...currentSso, method],
      });
    },
    [methods, setMethods],
  );

  const setPublishableKey = useCallback((publishableKey: string) => {
    setDraft((current) => updateClerkPublishableKey(current, publishableKey));
  }, []);
  const setProviderId = useCallback(
    (key: "password" | "emailCode", value: string) => {
      setDraft((current) => {
        if (current.auth.provider !== "convex-auth") return current;
        return updateConvexAuthProviderIds(current, {
          ...getConvexAuthProviderIds(current.auth),
          [key]: value,
        });
      });
    },
    [],
  );
  const setSsoProviderId = useCallback((methodId: string, value: string) => {
    setDraft((current) => {
      if (current.auth.provider !== "convex-auth") return current;
      const providerIds = getConvexAuthProviderIds(current.auth);
      return updateConvexAuthProviderIds(current, {
        ...providerIds,
        sso: { ...providerIds.sso, [methodId]: value },
      });
    });
  }, []);

  const validateConvexFields = useCallback(() => {
    const nextIssues = getConvexSetupIssues(draft);
    setIssues(nextIssues);
    return nextIssues.length === 0;
  }, [draft]);
  const validateSignInMethods = useCallback(() => {
    const nextIssues = getSignInMethodIssues(methods);
    setIssues(nextIssues);
    return nextIssues.length === 0;
  }, [methods]);

  const testConnection = useCallback(async () => {
    const key = getConnectionKey(draft.convexUrl, draft.apiNamespace);
    setIssues([]);
    setConnectionTest({ key, status: "testing" });
    const result = await testConvexAdminConnection({
      convexUrl: draft.convexUrl,
      apiNamespace: draft.apiNamespace,
    });
    if (connectionKeyRef.current !== key) return result;
    if (result.ok) {
      setConnectionTest({ key, status: "success", isAdmin: result.isAdmin });
    } else {
      setConnectionTest({ key, status: "error", message: result.error });
      setIssues([result.error]);
    }
    return result;
  }, [draft.apiNamespace, draft.convexUrl]);

  const save = useCallback(async () => {
    const project = buildFinalProjectConfig(draft);
    const validation = validateAdminProjectConfig(project);
    if (!validation.valid) {
      setIssues(validation.issues);
      return false;
    }

    setIssues([]);
    setSaving(true);
    try {
      const connection =
        connectionTest?.key === connectionKey &&
        connectionTest.status === "success"
          ? { ok: true as const, isAdmin: connectionTest.isAdmin }
          : await testConnection();
      if (!connection.ok) return false;
      if (connectionKeyRef.current !== connectionKey) {
        setIssues([
          "The connection fields changed while they were being tested. Test the connection again before saving.",
        ]);
        return false;
      }
      await onSave(project);
      return true;
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "Could not save this project.",
      ]);
      return false;
    } finally {
      setSaving(false);
    }
  }, [connectionKey, connectionTest, draft, onSave, testConnection]);

  const value = useMemo<ProjectSetupContextValue>(
    () => ({
      draft,
      provider,
      methods,
      providerIds,
      publishableKey,
      connectionKey,
      connectionTest,
      issues,
      saving,
      isEditing: Boolean(initialProject),
      canCancel: Boolean(onCancel),
      cancel: onCancel ?? (() => undefined),
      setProjectName,
      setConvexUrl,
      setApiNamespace,
      selectProvider,
      setPasswordEnabled,
      setEmailCodeEnabled,
      toggleSsoMethod,
      setPublishableKey,
      setProviderId,
      setSsoProviderId,
      validateConvexFields,
      validateSignInMethods,
      testConnection,
      save,
    }),
    [
      connectionKey,
      connectionTest,
      draft,
      initialProject,
      issues,
      methods,
      onCancel,
      provider,
      providerIds,
      publishableKey,
      save,
      saving,
      selectProvider,
      setApiNamespace,
      setConvexUrl,
      setEmailCodeEnabled,
      setPasswordEnabled,
      setProjectName,
      setProviderId,
      setPublishableKey,
      setSsoProviderId,
      testConnection,
      toggleSsoMethod,
      validateConvexFields,
      validateSignInMethods,
    ],
  );

  return (
    <ProjectSetupContext.Provider value={value}>
      {children}
    </ProjectSetupContext.Provider>
  );
}

export function useProjectSetup(): ProjectSetupContextValue {
  const value = useContext(ProjectSetupContext);
  if (!value) {
    throw new Error(
      "useProjectSetup must be used inside the project setup Stack.",
    );
  }
  return value;
}

export function getConnectionKey(
  convexUrl: string,
  apiNamespace: string,
): string {
  return `${convexUrl.trim().replace(/\/+$/, "")}\u0000${apiNamespace
    .trim()
    .replace(/^api\.?/i, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".")}`;
}

function replaceAuthMethods(
  auth: AdminProjectConfig["auth"],
  methods: AdminAuthMethods,
): AdminProjectConfig["auth"] {
  if (auth.provider === "clerk") {
    return {
      provider: "clerk",
      publicConfig: { ...auth.publicConfig, methods },
    };
  }
  if (auth.provider === "convex-auth") {
    return {
      provider: "convex-auth",
      publicConfig: { ...auth.publicConfig, methods },
    };
  }
  return { ...auth, publicConfig: { ...auth.publicConfig, methods } };
}

function isSupportedProvider(
  provider: AdminProjectConfig["auth"]["provider"],
): provider is SetupSupportedProvider {
  return provider === "convex-auth" || provider === "clerk";
}
