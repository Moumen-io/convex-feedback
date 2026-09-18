import {
  useAuth as useClerkAuth,
  useSignIn,
  useSSO,
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
  ConvexReactClient,
  useConvexAuth as useConvexProviderAuth,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as Linking from "expo-linking";
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
  AdminMfaMethod,
  AdminProjectConfig,
} from "./contracts.js";
import {
  createSecureTokenStorage,
  createNamespacedClerkTokenCache,
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
  return (
    <ConvexAuthProvider
      client={client}
      storage={createSecureTokenStorage(project.id)}
      storageNamespace={`convex-feedback-admin-${project.id}`}
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
  const availableSsoMethods = methods.sso ?? [];

  const signIn = useCallback(
    async (request: AdminAuthSignInRequest): Promise<AdminAuthResult> => {
      try {
        if (request.kind === "password") {
          await actions.signIn("password", {
            flow: "signIn",
            email: request.identifier.trim(),
            password: request.password,
          });
          return { ok: true };
        }

        if (request.kind === "email-code") {
          if (request.code) {
            await actions.signIn("email", {
              email: request.email.trim(),
              code: request.code.trim(),
            });
            setEmailCodeSent(false);
          } else {
            await actions.signIn("email", { email: request.email.trim() });
            setEmailCodeSent(true);
          }
          return { ok: true };
        }

        if (request.kind === "sso") {
          const redirectUri = Linking.createURL("auth/callback");
          const result = await actions.signIn(request.method.id, {
            redirectTo: redirectUri,
          });
          if (!result.redirect) return { ok: true };

          const browserResult = await WebBrowser.openAuthSessionAsync(
            result.redirect.toString(),
            redirectUri,
          );
          if (browserResult.type !== "success") {
            return { ok: false, error: "The sign-in flow was cancelled." };
          }
          const code = new URL(browserResult.url).searchParams.get("code");
          if (!code) {
            return {
              ok: false,
              error: "The sign-in callback did not include a code.",
            };
          }
          await actions.signIn(request.method.id, {
            code,
            redirectTo: redirectUri,
          });
          return { ok: true };
        }

        return {
          ok: false,
          error:
            "This Convex Auth deployment does not expose an MFA adapter yet.",
        };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [actions],
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
      supportsPassword: methods.password === true,
      supportsEmailCode: methods.emailCode === true,
      challenge: emailCodeSent
        ? { kind: "email-code", title: "Enter the code sent to your email." }
        : null,
      signIn,
      signOut: actions.signOut,
      getToken: async () => token,
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
  if (project.auth.provider !== "clerk") return null;
  return (
    <ClerkProvider
      publishableKey={project.auth.publicConfig.publishableKey}
      tokenCache={createNamespacedClerkTokenCache(project.id)}
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
  const convexAuth = useConvexProviderAuth();
  const { user } = useUser();
  const signInResource = useSignIn();
  const { startSSOFlow } = useSSO();
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
          const result = await signInFuture.password({
            identifier: request.identifier.trim(),
            password: request.password,
          });
          return result.error
            ? { ok: false, error: result.error.message }
            : { ok: true };
        }

        if (request.kind === "email-code") {
          const result = request.code
            ? await signInFuture.emailCode.verifyCode({
                code: request.code.trim(),
              })
            : await signInFuture.emailCode.sendCode({
                emailAddress: request.email.trim(),
              });
          if (result.error) return { ok: false, error: result.error.message };
          setEmailCodeSent(!request.code);
          return { ok: true };
        }

        if (request.kind === "sso") {
          const strategy = request.method.id.startsWith("oauth_")
            ? request.method.id
            : `oauth_${request.method.id}`;
          const result = await startSSOFlow({
            strategy: strategy as never,
            redirectUrl: Linking.createURL("auth/callback"),
          });
          if (result.createdSessionId && result.setActive) {
            await result.setActive({ session: result.createdSessionId });
          }
          return { ok: true };
        }

        const code = request.code?.trim();
        let result: { error: { message: string } | null };
        if (request.method === "email-code") {
          result = code
            ? await signInFuture.mfa.verifyEmailCode({ code })
            : await signInFuture.mfa.sendEmailCode();
        } else if (request.method === "phone-code") {
          result = code
            ? await signInFuture.mfa.verifyPhoneCode({ code })
            : await signInFuture.mfa.sendPhoneCode();
        } else if (request.method === "totp") {
          if (!code)
            return { ok: false, error: "Enter your authenticator code." };
          result = await signInFuture.mfa.verifyTOTP({ code });
        } else {
          if (!code) return { ok: false, error: "Enter your backup code." };
          result = await signInFuture.mfa.verifyBackupCode({ code });
        }
        return result.error
          ? { ok: false, error: result.error.message }
          : { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    [signInFuture, startSSOFlow],
  );

  const challenge = useMemo<AdminAuthChallenge | null>(() => {
    if (signInFuture?.status === "needs_second_factor") {
      return {
        kind: "mfa",
        title: "Complete the second-factor challenge.",
        methods: mapMfaMethods(signInFuture.supportedSecondFactors),
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
      supportsPassword: false,
      supportsEmailCode: false,
      challenge: null,
      signIn: async () => ({
        ok: false,
        error: `${config.provider} support is not available in this build yet.`,
      }),
      signOut: async () => undefined,
      getToken: async () => null,
    }),
    [config.provider],
  );
  return (
    <AdminAuthContext.Provider value={controller}>
      {children}
    </AdminAuthContext.Provider>
  );
}

function mapMfaMethods(
  factors: readonly { strategy?: string }[] | null | undefined,
): AdminMfaMethod[] {
  const methods = new Set<AdminMfaMethod>();
  for (const factor of factors ?? []) {
    if (factor.strategy === "email_code") methods.add("email-code");
    if (factor.strategy === "phone_code") methods.add("phone-code");
    if (factor.strategy === "totp") methods.add("totp");
    if (factor.strategy === "backup_code") methods.add("backup-code");
  }
  return [...methods];
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Authentication failed. Check the details and try again.";
}
