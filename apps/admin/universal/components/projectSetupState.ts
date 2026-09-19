import {
  isValidConvexUrl,
  isValidNamespace,
  normalizeApiNamespace,
  normalizeConvexUrl,
  normalizeProjectConfig,
} from "convex-feedback-admin-auth/config";
import type {
  AdminAuthConfig,
  AdminAuthMethods,
  AdminProjectConfig,
  AdminSsoMethod,
  ConvexAuthProviderIds,
} from "convex-feedback-admin-auth";

export type SetupSupportedProvider = "convex-auth" | "clerk";

export const DEFAULT_SETUP_METHODS: AdminAuthMethods = {
  password: true,
  emailCode: false,
  sso: [],
};

export const EMPTY_CONVEX_AUTH_PROVIDER_IDS: ConvexAuthProviderIds = {
  password: "",
  emailCode: "",
  sso: {},
};

export function getConnectionKey(
  convexUrl: string,
  apiNamespace: string,
): string {
  return `${normalizeConvexUrl(convexUrl)}\u0000${normalizeApiNamespace(
    apiNamespace,
  )}`;
}

export function createProjectSetupDraft(
  initialProject?: AdminProjectConfig,
  now = Date.now(),
): AdminProjectConfig {
  if (initialProject) {
    return {
      ...initialProject,
      apiNamespace: normalizeApiNamespace(initialProject.apiNamespace),
      auth: cloneAuthConfig(initialProject.auth),
    };
  }

  return {
    id: `project-${now.toString(36)}`,
    name: "",
    convexUrl: "",
    apiNamespace: "",
    auth: {
      provider: "convex-auth",
      publicConfig: {
        methods: cloneAuthMethods(DEFAULT_SETUP_METHODS),
        providerIds: cloneProviderIds(EMPTY_CONVEX_AUTH_PROVIDER_IDS),
      },
    },
    updatedAt: now,
  };
}

export function updateProjectIdentity(
  draft: AdminProjectConfig,
  fields: Partial<
    Pick<AdminProjectConfig, "name" | "convexUrl" | "apiNamespace">
  >,
): AdminProjectConfig {
  return {
    ...draft,
    ...fields,
    apiNamespace: normalizeApiNamespace(
      fields.apiNamespace ?? draft.apiNamespace,
    ),
  };
}

export function updateProjectAuthProvider(
  draft: AdminProjectConfig,
  provider: SetupSupportedProvider,
): AdminProjectConfig {
  if (draft.auth.provider === provider) return draft;

  const methods = getAuthMethods(draft.auth);
  return {
    ...draft,
    auth: createAuthConfig(provider, methods),
  };
}

export function updateProjectAuthMethods(
  draft: AdminProjectConfig,
  methods: AdminAuthMethods,
): AdminProjectConfig {
  return {
    ...draft,
    auth: setAuthMethods(draft.auth, methods),
  };
}

export function updateConvexAuthProviderIds(
  draft: AdminProjectConfig,
  providerIds: ConvexAuthProviderIds,
): AdminProjectConfig {
  if (draft.auth.provider !== "convex-auth") return draft;
  return {
    ...draft,
    auth: {
      provider: "convex-auth",
      publicConfig: {
        methods: cloneAuthMethods(draft.auth.publicConfig.methods),
        providerIds: cloneProviderIds(providerIds),
      },
    },
  };
}

export function updateClerkPublishableKey(
  draft: AdminProjectConfig,
  publishableKey: string,
): AdminProjectConfig {
  if (draft.auth.provider !== "clerk") return draft;
  return {
    ...draft,
    auth: {
      provider: "clerk",
      publicConfig: {
        methods: cloneAuthMethods(draft.auth.publicConfig.methods),
        publishableKey,
      },
    },
  };
}

export function buildFinalProjectConfig(
  draft: AdminProjectConfig,
  now = Date.now(),
): AdminProjectConfig {
  return normalizeProjectConfig({ ...draft, updatedAt: now });
}

export function getConvexSetupIssues(draft: AdminProjectConfig): string[] {
  const issues: string[] = [];
  const convexUrl = normalizeConvexUrl(draft.convexUrl);
  const apiNamespace = normalizeApiNamespace(draft.apiNamespace);

  if (!draft.name.trim()) issues.push("Give this project a name.");
  if (!isValidConvexUrl(convexUrl)) {
    issues.push(
      "Enter a valid Convex deployment URL without a path, query string, or fragment.",
    );
  }
  if (!apiNamespace || !isValidNamespace(apiNamespace)) {
    issues.push("Enter a valid API namespace, such as feedback.");
  }
  return issues;
}

export function getSignInMethodIssues(methods: AdminAuthMethods): string[] {
  const hasMethod =
    methods.password === true ||
    methods.emailCode === true ||
    (methods.sso?.length ?? 0) > 0;
  return hasMethod
    ? []
    : ["Choose at least one supported admin sign-in method."];
}

export function getAuthMethods(auth: AdminAuthConfig): AdminAuthMethods {
  return cloneAuthMethods(auth.publicConfig.methods ?? {});
}

export function getConvexAuthProviderIds(
  auth: AdminAuthConfig,
): ConvexAuthProviderIds {
  if (auth.provider !== "convex-auth") {
    return cloneProviderIds(EMPTY_CONVEX_AUTH_PROVIDER_IDS);
  }
  return cloneProviderIds(auth.publicConfig.providerIds);
}

export function getClerkPublishableKey(auth: AdminAuthConfig): string {
  return auth.provider === "clerk" ? auth.publicConfig.publishableKey : "";
}

export function cloneAuthConfig(auth: AdminAuthConfig): AdminAuthConfig {
  if (auth.provider === "clerk") {
    return {
      provider: "clerk",
      publicConfig: {
        publishableKey: auth.publicConfig.publishableKey,
        methods: cloneAuthMethods(auth.publicConfig.methods),
      },
    };
  }
  if (auth.provider === "convex-auth") {
    return {
      provider: "convex-auth",
      publicConfig: {
        methods: cloneAuthMethods(auth.publicConfig.methods),
        providerIds: cloneProviderIds(auth.publicConfig.providerIds),
      },
    };
  }
  return {
    provider: auth.provider,
    publicConfig: {
      ...auth.publicConfig,
      methods: auth.publicConfig.methods
        ? cloneAuthMethods(auth.publicConfig.methods)
        : undefined,
    },
  };
}

function createAuthConfig(
  provider: SetupSupportedProvider,
  methods: AdminAuthMethods,
): AdminAuthConfig {
  if (provider === "clerk") {
    return {
      provider: "clerk",
      publicConfig: {
        publishableKey: "",
        methods: cloneAuthMethods(methods),
      },
    };
  }
  return {
    provider: "convex-auth",
    publicConfig: {
      methods: cloneAuthMethods(methods),
      providerIds: cloneProviderIds(EMPTY_CONVEX_AUTH_PROVIDER_IDS),
    },
  };
}

function setAuthMethods(
  auth: AdminAuthConfig,
  methods: AdminAuthMethods,
): AdminAuthConfig {
  if (auth.provider === "clerk") {
    return {
      provider: "clerk",
      publicConfig: {
        publishableKey: auth.publicConfig.publishableKey,
        methods: cloneAuthMethods(methods),
      },
    };
  }
  if (auth.provider === "convex-auth") {
    return {
      provider: "convex-auth",
      publicConfig: {
        methods: cloneAuthMethods(methods),
        providerIds: cloneProviderIds(auth.publicConfig.providerIds),
      },
    };
  }
  return { ...auth, publicConfig: { ...auth.publicConfig, methods } };
}

function cloneAuthMethods(methods: AdminAuthMethods): AdminAuthMethods {
  return {
    password: methods.password === true,
    emailCode: methods.emailCode === true,
    sso: (methods.sso ?? []).map(cloneSsoMethod),
  };
}

function cloneSsoMethod(method: AdminSsoMethod): AdminSsoMethod {
  return { id: method.id, label: method.label };
}

function cloneProviderIds(
  providerIds: ConvexAuthProviderIds,
): ConvexAuthProviderIds {
  return {
    password: providerIds.password,
    emailCode: providerIds.emailCode,
    sso: { ...providerIds.sso },
  };
}
