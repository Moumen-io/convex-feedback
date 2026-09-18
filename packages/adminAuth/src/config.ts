import type {
  AdminAuthConfig,
  AdminAuthMethods,
  AdminAuthProviderId,
  AdminProjectConfig,
  AdminSsoMethod,
} from "./contracts.js";

export interface AdminAuthProviderMetadata {
  id: AdminAuthProviderId;
  label: string;
  status: "supported" | "placeholder";
  description: string;
}

export const ADMIN_AUTH_PROVIDERS: readonly AdminAuthProviderMetadata[] = [
  {
    id: "convex-auth",
    label: "Convex Auth",
    status: "supported",
    description:
      "Use the auth configuration exposed by your Convex deployment.",
  },
  {
    id: "clerk",
    label: "Clerk",
    status: "supported",
    description:
      "Use a Clerk publishable key and the Convex Clerk integration.",
  },
  {
    id: "auth0",
    label: "Auth0",
    status: "placeholder",
    description:
      "Adapter placeholder; support will be added in a future release.",
  },
  {
    id: "workos",
    label: "WorkOS",
    status: "placeholder",
    description: "Adapter placeholder for WorkOS SSO.",
  },
  {
    id: "oidc",
    label: "Generic OIDC",
    status: "placeholder",
    description: "Adapter placeholder for a generic OIDC provider.",
  },
] as const;

export const DEFAULT_SSO_METHODS: readonly AdminSsoMethod[] = [
  { id: "apple", label: "Apple" },
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
];

export function normalizeApiNamespace(value: string): string {
  return value
    .trim()
    .replace(/^api\.?/i, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

export function normalizeConvexUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function normalizeSsoMethods(
  methods: readonly AdminSsoMethod[] | undefined,
): AdminSsoMethod[] {
  const seen = new Set<string>();
  return (methods ?? [])
    .map((method) => ({
      id: method.id.trim().toLowerCase(),
      label: method.label.trim(),
    }))
    .filter((method) => {
      if (!method.id || !method.label || seen.has(method.id)) return false;
      seen.add(method.id);
      return true;
    })
    .sort((left, right) => {
      if (left.id === "apple") return -1;
      if (right.id === "apple") return 1;
      return left.label.localeCompare(right.label);
    });
}

export function normalizeAuthMethods(
  methods: AdminAuthMethods,
): AdminAuthMethods {
  return {
    password: methods.password === true,
    emailCode: methods.emailCode === true,
    sso: normalizeSsoMethods(methods.sso),
  };
}

export function normalizeProjectConfig(
  config: AdminProjectConfig,
): AdminProjectConfig {
  return {
    ...config,
    id: config.id.trim(),
    name: config.name.trim(),
    convexUrl: normalizeConvexUrl(config.convexUrl),
    apiNamespace: normalizeApiNamespace(config.apiNamespace),
    auth: normalizeAuthConfig(config.auth),
  };
}

export function normalizeAuthConfig(auth: AdminAuthConfig): AdminAuthConfig {
  if (auth.provider === "clerk") {
    return {
      provider: auth.provider,
      publicConfig: {
        publishableKey: auth.publicConfig.publishableKey.trim(),
        methods: normalizeAuthMethods(auth.publicConfig.methods),
      },
    };
  }
  if (auth.provider === "convex-auth") {
    return {
      provider: auth.provider,
      publicConfig: {
        methods: normalizeAuthMethods(auth.publicConfig.methods),
      },
    };
  }
  return {
    provider: auth.provider,
    publicConfig: {
      ...auth.publicConfig,
      methods: auth.publicConfig.methods
        ? normalizeAuthMethods(auth.publicConfig.methods)
        : undefined,
    },
  };
}

export interface AdminConfigValidation {
  valid: boolean;
  issues: string[];
}

export function validateAdminProjectConfig(
  input: AdminProjectConfig,
): AdminConfigValidation {
  const config = normalizeProjectConfig(input);
  const issues: string[] = [];

  if (!config.id) issues.push("A project identifier is required.");
  if (!config.name) issues.push("Give this project a name.");
  if (!Number.isFinite(config.updatedAt)) {
    issues.push("Project configuration has an invalid timestamp.");
  }
  if (!isValidConvexUrl(config.convexUrl)) {
    issues.push("Enter a valid Convex deployment URL.");
  }
  if (!config.apiNamespace || !isValidNamespace(config.apiNamespace)) {
    issues.push("Enter a valid API namespace, such as feedback.");
  }

  // Inspect the unnormalized input as well: normalization intentionally keeps
  // only supported public fields for known providers, so a secret-looking
  // unknown field must be rejected before it can be discarded silently.
  if (
    containsServerSecret(input.auth.publicConfig) ||
    containsServerSecret(config.auth.publicConfig)
  ) {
    issues.push("Only public authentication configuration is allowed.");
  }

  if (config.auth.provider === "clerk") {
    if (
      !/^pk_(test|live)_[A-Za-z0-9_\-]+$/.test(
        config.auth.publicConfig.publishableKey,
      )
    ) {
      issues.push(
        "Enter a Clerk publishable key beginning with pk_test_ or pk_live_.",
      );
    }
    validateMethods(config.auth.publicConfig.methods, issues);
  } else if (config.auth.provider === "convex-auth") {
    validateMethods(config.auth.publicConfig.methods, issues);
  } else {
    issues.push(
      `${getProviderLabel(config.auth.provider)} is reserved for a future adapter. Choose Convex Auth or Clerk for now.`,
    );
  }

  return { valid: issues.length === 0, issues };
}

export function isValidConvexUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          (url.hostname === "localhost" || url.hostname === "127.0.0.1"))) &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export function isValidNamespace(value: string): boolean {
  return value
    .split(".")
    .every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part));
}

export function getProviderLabel(provider: AdminAuthProviderId): string {
  return (
    ADMIN_AUTH_PROVIDERS.find((entry) => entry.id === provider)?.label ??
    provider
  );
}

function validateMethods(methods: AdminAuthMethods, issues: string[]): void {
  const hasMethod =
    methods.password === true ||
    methods.emailCode === true ||
    (methods.sso?.length ?? 0) > 0;
  if (!hasMethod) {
    issues.push("Choose at least one supported admin sign-in method.");
  }
  for (const method of methods.sso ?? []) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(method.id)) {
      issues.push(`SSO method \"${method.label}\" has an invalid id.`);
    }
  }
}

function containsServerSecret(value: unknown, key = ""): boolean {
  if (
    /(secret|private|client_secret|signing|access_token|refresh_token)/i.test(
      key,
    )
  ) {
    return true;
  }
  if (typeof value === "string") {
    return /(^|_)(sk|secret|private)[_-]/i.test(value);
  }
  if (Array.isArray(value))
    return value.some((entry) => containsServerSecret(entry));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([entryKey, entryValue]) =>
      containsServerSecret(entryValue, entryKey),
    );
  }
  return false;
}
