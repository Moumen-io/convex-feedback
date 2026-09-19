import {
  useAuth as useClerkAuth,
  useClerk,
  useSignIn,
  useUser,
} from "@clerk/expo";
import { ClerkProvider } from "@clerk/expo";
import { UserProfileView } from "@clerk/expo/native";
import {
  ConvexAuthProvider,
  useAuthActions,
  useAuthToken,
  useConvexAuth,
} from "@convex-dev/auth/react";
import {
  ConvexProvider,
  useConvexAuth as useConvexProviderAuth,
} from "convex/react";
import type { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import type {
  AdminAuthAccount,
  AdminAuthChallenge,
  AdminAuthConfig,
  AdminAuthController,
  AdminAuthResult,
  AdminAuthSignInRequest,
  AdminProjectConfig,
} from "./contracts.js";
import {
  clerkErrorResult,
  completeClerkSignIn,
  finalizeClerkSignIn,
  mapClerkMfaMethods,
  signInWithClerkSso,
  signInWithConvexAuth,
} from "./flows.js";
import { getNativeAuthCallbackUrl } from "./native-callback.js";
import {
  createSecureTokenStorage,
  createNamespacedClerkTokenCache,
  getConvexAuthStorageNamespace,
} from "./storage.js";

export interface AdminAuthRuntimeProps {
  project: AdminProjectConfig;
  client: ConvexReactClient;
  children: ReactNode;
}

const AdminAuthContext = createContext<AdminAuthController | null>(null);

export function AdminAuthRuntime({
  project,
  client,
  children,
}: AdminAuthRuntimeProps) {
  switch (project.auth.provider) {
    case "convex-auth":
      return (
        <ConvexAuthRuntime project={project} client={client}>
          {children}
        </ConvexAuthRuntime>
      );
    case "clerk":
      return (
        <ClerkRuntime project={project} client={client}>
          {children}
        </ClerkRuntime>
      );
    default:
      return (
        <ConvexProvider client={client}>
          <UnsupportedAuthRuntime config={project.auth}>
            {children}
          </UnsupportedAuthRuntime>
        </ConvexProvider>
      );
  }
}

export function useAdminAuth(): AdminAuthController {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error("useAdminAuth must be used inside AdminAuthRuntime.");
  }
  return value;
}

/** Renders provider-owned account management while keeping it out of app screens. */
export function AdminAuthAccountView({ onDismiss }: { onDismiss: () => void }) {
  const auth = useAdminAuth();
  if (auth.provider !== "clerk") {
    return <View />;
  }
  return (
    <UserProfileView
      isDismissible={false}
      onDismiss={onDismiss}
      style={{ flex: 1 }}
    />
  );
}

function ConvexAuthRuntime({
  project,
  client,
  children,
}: AdminAuthRuntimeProps) {
  const storage = useMemo(
    () => createSecureTokenStorage(project.id),
    [project.id],
  );
  return (
    <ConvexAuthProvider
      client={client}
      key={`admin-project:${project.id}`}
      storage={storage}
      storageNamespace={getConvexAuthStorageNamespace(project.id)}
      shouldHandleCode={false}
      replaceURL={() => undefined}
    >
      <ConvexAuthBridge project={project}>{children}</ConvexAuthBridge>
    </ConvexAuthProvider>
  );
}

function ConvexAuthBridge({
  project,
  children,
}: {
  project: AdminProjectConfig;
  children: ReactNode;
}) {
  const authState = useConvexAuth();
  const token = useAuthToken();
  const actions = useAuthActions();
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const methods =
    project.auth.provider === "convex-auth"
      ? project.auth.publicConfig.methods
      : {};
  const providerIds =
    project.auth.provider === "convex-auth"
      ? project.auth.publicConfig.providerIds
      : { password: "", emailCode: "", sso: {} };
  const availableSsoMethods = methods.sso ?? [];

  const signIn = useCallback(
    async (request: AdminAuthSignInRequest): Promise<AdminAuthResult> => {
      try {
        const result = await signInWithConvexAuth(
          request,
          providerIds,
          actions.signIn,
          {
            redirectUri: createNativeAuthCallbackUrl(),
            openAuthSession: (url, redirectUri) =>
              WebBrowser.openAuthSessionAsync(url, redirectUri),
          },
        );
        if (result.ok && request.kind === "email-code") {
          setEmailCodeSent(!request.code);
        }
        return result;
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [actions, providerIds],
  );

  const controller = useMemo<AdminAuthController>(
    () => ({
      provider: "convex-auth",
      status: authState.isLoading
        ? "loading"
        : authState.isAuthenticated
          ? "signed-in"
          : "signed-out",
      isLoaded: !authState.isLoading,
      isAuthenticated: authState.isAuthenticated,
      availableSsoMethods,
      ssoAccountCreationPolicy: "provider-managed",
      supportsPassword: methods.password === true,
      supportsEmailCode: methods.emailCode === true,
      challenge: emailCodeSent
        ? { kind: "email-code", title: "Enter the code sent to your email." }
        : null,
      signIn,
      signOut: actions.signOut,
      getToken: () => Promise.resolve(token),
    }),
    [
      actions.signOut,
      authState,
      availableSsoMethods,
      emailCodeSent,
      methods,
      signIn,
      token,
    ],
  );

  return (
    <AdminAuthContext.Provider value={controller}>
      {children}
    </AdminAuthContext.Provider>
  );
}

function ClerkRuntime({ project, client, children }: AdminAuthRuntimeProps) {
  const tokenCache = useMemo(
    () => createNamespacedClerkTokenCache(project.id),
    [project.id],
  );
  if (project.auth.provider !== "clerk") return null;
  return (
    <ClerkProvider
      key={`admin-project:${project.id}:${project.auth.publicConfig.publishableKey}`}
      publishableKey={project.auth.publicConfig.publishableKey}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={client} useAuth={useClerkAuth}>
        <ClerkAuthBridge project={project}>{children}</ClerkAuthBridge>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function ClerkAuthBridge({
  project,
  children,
}: {
  project: AdminProjectConfig;
  children: ReactNode;
}) {
  const clerkAuth = useClerkAuth({ treatPendingAsSignedOut: false });
  const clerk = useClerk();
  const convexAuth = useConvexProviderAuth();
  const { user } = useUser();
  const signInResource = useSignIn();
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const methods =
    project.auth.provider === "clerk" ? project.auth.publicConfig.methods : {};
  const availableSsoMethods = methods.sso ?? [];
  const signInFuture = signInResource.signIn;

  const signIn = useCallback(
    async (request: AdminAuthSignInRequest): Promise<AdminAuthResult> => {
      try {
        if (!signInFuture)
          return { ok: false, error: "Clerk is still loading." };

        if (request.kind === "password") {
          return completeClerkSignIn(signInFuture, () =>
            signInFuture.password({
              identifier: request.identifier.trim(),
              password: request.password,
            }),
          );
        }

        if (request.kind === "email-code") {
          if (request.code) {
            const code = request.code.trim();
            const result = await completeClerkSignIn(signInFuture, () =>
              signInFuture.emailCode.verifyCode({
                code,
              }),
            );
            if (result.ok) setEmailCodeSent(false);
            return result;
          }
          const result = await signInFuture.emailCode.sendCode({
            emailAddress: request.email.trim(),
          });
          if (result.error) return clerkErrorResult(result.error.message);
          setEmailCodeSent(true);
          return { ok: true };
        }

        if (request.kind === "sso") {
          return signInWithClerkSso(
            request.method.id,
            createNativeAuthCallbackUrl(),
            signInFuture,
            clerk.client,
            (url, redirectUrl) =>
              WebBrowser.openAuthSessionAsync(url, redirectUrl),
            ({ session }) => clerk.setActive({ session }),
          );
        }

        const code = request.code?.trim();
        if (request.method === "email-link") {
          const sent = await signInFuture.emailLink.sendLink({
            verificationUrl: createNativeAuthCallbackUrl(),
          });
          if (sent.error) return clerkErrorResult(sent.error.message);
          const verification =
            await signInFuture.emailLink.waitForVerification();
          if (verification.error) {
            return clerkErrorResult(verification.error.message);
          }
          return finalizeClerkSignIn(signInFuture);
        } else if (request.method === "email-code") {
          if (!code) {
            const result = await signInFuture.mfa.sendEmailCode();
            return result.error
              ? clerkErrorResult(result.error.message)
              : { ok: true };
          }
          return completeClerkSignIn(signInFuture, () =>
            signInFuture.mfa.verifyEmailCode({ code }),
          );
        } else if (request.method === "phone-code") {
          if (!code) {
            const result = await signInFuture.mfa.sendPhoneCode();
            return result.error
              ? clerkErrorResult(result.error.message)
              : { ok: true };
          }
          return completeClerkSignIn(signInFuture, () =>
            signInFuture.mfa.verifyPhoneCode({ code }),
          );
        } else if (request.method === "totp") {
          if (!code)
            return { ok: false, error: "Enter your authenticator code." };
          return completeClerkSignIn(signInFuture, () =>
            signInFuture.mfa.verifyTOTP({ code }),
          );
        } else {
          if (!code) return { ok: false, error: "Enter your backup code." };
          return completeClerkSignIn(signInFuture, () =>
            signInFuture.mfa.verifyBackupCode({ code }),
          );
        }
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [clerk, signInFuture],
  );

  const challenge = useMemo<AdminAuthChallenge | null>(() => {
    if (
      signInFuture?.status === "needs_second_factor" ||
      signInFuture?.status === "needs_client_trust"
    ) {
      return {
        kind: "mfa",
        title:
          signInFuture.status === "needs_client_trust"
            ? "Verify this device to continue."
            : "Complete the second-factor challenge.",
        methods: mapClerkMfaMethods(signInFuture.supportedSecondFactors),
      };
    }
    if (emailCodeSent) {
      return {
        kind: "email-code",
        title: "Enter the code sent to your email.",
      };
    }
    return null;
  }, [emailCodeSent, signInFuture]);

  const account: AdminAuthAccount | undefined = user
    ? {
        name: user.fullName ?? user.username ?? undefined,
        email: user.primaryEmailAddress?.emailAddress,
        imageUrl: user.imageUrl,
      }
    : undefined;

  const controller = useMemo<AdminAuthController>(
    () => ({
      provider: "clerk",
      status:
        !clerkAuth.isLoaded || convexAuth.isLoading
          ? "loading"
          : clerkAuth.isSignedIn === true && convexAuth.isAuthenticated
            ? "signed-in"
            : "signed-out",
      isLoaded: clerkAuth.isLoaded && !convexAuth.isLoading,
      isAuthenticated:
        clerkAuth.isSignedIn === true && convexAuth.isAuthenticated,
      account,
      availableSsoMethods,
      ssoAccountCreationPolicy: "existing-only",
      supportsPassword: methods.password === true,
      supportsEmailCode: methods.emailCode === true,
      challenge,
      signIn,
      signOut: async () => {
        await clerkAuth.signOut();
      },
      getToken: async () => clerkAuth.getToken({ template: "convex" }),
    }),
    [
      account,
      availableSsoMethods,
      challenge,
      clerkAuth,
      convexAuth,
      methods,
      signIn,
    ],
  );

  return (
    <AdminAuthContext.Provider value={controller}>
      {children}
    </AdminAuthContext.Provider>
  );
}

function UnsupportedAuthRuntime({
  config,
  children,
}: {
  config: AdminAuthConfig;
  children: ReactNode;
}) {
  const controller = useMemo<AdminAuthController>(
    () => ({
      provider: config.provider,
      status: "signed-out",
      isLoaded: true,
      isAuthenticated: false,
      availableSsoMethods: [],
      ssoAccountCreationPolicy: "provider-managed",
      supportsPassword: false,
      supportsEmailCode: false,
      challenge: null,
      signIn: () =>
        Promise.resolve({
          ok: false as const,
          error: `${config.provider} support is not available in this build yet.`,
        }),
      signOut: () => Promise.resolve(),
      getToken: () => Promise.resolve(null),
    }),
    [config.provider],
  );
  return (
    <AdminAuthContext.Provider value={controller}>
      {children}
    </AdminAuthContext.Provider>
  );
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Authentication failed. Check the details and try again.";
}

function createNativeAuthCallbackUrl(): string {
  return getNativeAuthCallbackUrl();
}
