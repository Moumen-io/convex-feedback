export type AdminAuthProviderId =
  "convex-auth" | "clerk" | "auth0" | "workos" | "oidc";

export type AdminAuthProviderStatus = "supported" | "placeholder";

export interface AdminSsoMethod {
  /** Stable method id, such as `apple` or `oauth_google`. */
  id: string;
  /** Label shown in the provider-agnostic login UI. */
  label: string;
}

export interface AdminAuthMethods {
  password?: boolean;
  emailCode?: boolean;
  sso?: AdminSsoMethod[];
}

export interface ConvexAuthPublicConfig {
  methods: AdminAuthMethods;
}

export interface ClerkPublicConfig {
  /** Clerk publishable key. Secret keys are intentionally not accepted. */
  publishableKey: string;
  methods: AdminAuthMethods;
}

export interface FutureAuthPublicConfig {
  methods?: AdminAuthMethods;
  /** Public provider settings only. Never put client secrets in this object. */
  publicConfig?: Record<string, string | number | boolean>;
}

export type AdminAuthConfig =
  | { provider: "convex-auth"; publicConfig: ConvexAuthPublicConfig }
  | { provider: "clerk"; publicConfig: ClerkPublicConfig }
  | { provider: "auth0"; publicConfig: FutureAuthPublicConfig }
  | { provider: "workos"; publicConfig: FutureAuthPublicConfig }
  | { provider: "oidc"; publicConfig: FutureAuthPublicConfig };

export interface AdminProjectConfig {
  id: string;
  name: string;
  convexUrl: string;
  /** Namespace below `api`, for example `feedback` or `feedback.admin`. */
  apiNamespace: string;
  auth: AdminAuthConfig;
  updatedAt: number;
}

export interface AdminAuthAccount {
  name?: string;
  email?: string;
  imageUrl?: string;
}

export type AdminAuthChallenge =
  | {
      kind: "email-code";
      title: string;
      email?: string;
    }
  | {
      kind: "mfa";
      title: string;
      methods: AdminMfaMethod[];
    };

export type AdminMfaMethod =
  "email-code" | "phone-code" | "totp" | "backup-code";

export type AdminAuthSignInRequest =
  | { kind: "password"; identifier: string; password: string }
  | { kind: "email-code"; email: string; code?: string }
  | { kind: "sso"; method: AdminSsoMethod }
  | { kind: "mfa"; method: AdminMfaMethod; code?: string };

export type AdminAuthResult = { ok: true } | { ok: false; error: string };

export interface AdminAuthController {
  provider: AdminAuthProviderId;
  status: "loading" | "signed-out" | "signed-in";
  isLoaded: boolean;
  isAuthenticated: boolean;
  account?: AdminAuthAccount;
  availableSsoMethods: AdminSsoMethod[];
  supportsPassword: boolean;
  supportsEmailCode: boolean;
  challenge: AdminAuthChallenge | null;
  signIn: (request: AdminAuthSignInRequest) => Promise<AdminAuthResult>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}
