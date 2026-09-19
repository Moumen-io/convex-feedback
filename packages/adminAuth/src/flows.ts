import type {
  AdminAuthResult,
  AdminAuthSignInRequest,
  AdminMfaMethod,
  ConvexAuthProviderIds,
} from "./contracts.js";

export const NATIVE_AUTH_CALLBACK_PATH = "auth/callback";

export interface ClerkSsoSignInLike extends ClerkSignInResourceLike {
  create: (params: {
    // `never` keeps this structural adapter independent of Clerk's internal
    // OAuth strategy union while still allowing a provider-specific string at
    // the call site below.
    strategy: never;
    redirectUrl: string;
  }) => Promise<ClerkOperationResult>;
  firstFactorVerification: {
    status?: string | null;
    externalVerificationRedirectURL?: URL | null;
  };
  isTransferable?: boolean;
  existingSession?: { sessionId: string };
}

export interface ClerkSsoClientLike {
  signIn: {
    reload: (params: { rotatingTokenNonce: string }) => Promise<{
      __internal_future: ClerkSsoSignInLike;
    }>;
  };
}

export interface ClerkOperationResult {
  error: { message?: string } | null | undefined;
}

export interface ClerkSignInResourceLike {
  readonly status: string;
  finalize: () => Promise<ClerkOperationResult>;
}

/**
 * Run a Clerk operation that may complete a sign-in and activate its session.
 *
 * Clerk's custom-flow API intentionally separates completing a sign-in from
 * making its session active. Keeping that transition here makes it difficult
 * for one factor path to forget it.
 */
export async function completeClerkSignIn(
  signIn: ClerkSignInResourceLike,
  operation: () => Promise<ClerkOperationResult>,
): Promise<AdminAuthResult> {
  const result = await operation();
  if (result.error) return clerkErrorResult(result.error.message);
  return finalizeClerkSignIn(signIn);
}

export async function finalizeClerkSignIn(
  signIn: ClerkSignInResourceLike,
): Promise<AdminAuthResult> {
  if (signIn.status === "complete") {
    const result = await signIn.finalize();
    return result.error ? clerkErrorResult(result.error.message) : { ok: true };
  }

  if (
    signIn.status === "needs_second_factor" ||
    signIn.status === "needs_client_trust"
  ) {
    // The shared screen will render the factor exposed by
    // supportedSecondFactors on the next render.
    return { ok: true };
  }

  return {
    ok: false,
    error: `Clerk sign-in is not complete (status: ${signIn.status}).`,
  };
}

export function mapClerkMfaMethods(
  factors: readonly { strategy?: string }[] | null | undefined,
): AdminMfaMethod[] {
  const methods = new Set<AdminMfaMethod>();
  for (const factor of factors ?? []) {
    if (factor.strategy === "email_code") methods.add("email-code");
    if (factor.strategy === "email_link") methods.add("email-link");
    if (factor.strategy === "phone_code") methods.add("phone-code");
    if (factor.strategy === "totp") methods.add("totp");
    if (factor.strategy === "backup_code") methods.add("backup-code");
  }
  return [...methods];
}

export function clerkOAuthStrategy(methodId: string): string {
  return methodId.startsWith("oauth_") ? methodId : `oauth_${methodId}`;
}

/**
 * Run Clerk's native SSO flow without transferring an unknown identity to
 * sign-up. The installed `@clerk/expo` `useSSO()` helper performs that
 * transfer automatically, so the universal admin app must own this portion
 * of the flow to keep its sign-in-only contract.
 */
export async function signInWithClerkSso(
  methodId: string,
  redirectUrl: string,
  signIn: ClerkSsoSignInLike,
  client: ClerkSsoClientLike,
  openAuthSession: OpenAuthSession,
  setActive?: (params: { session: string }) => Promise<void>,
): Promise<AdminAuthResult> {
  try {
    const created = await signIn.create({
      strategy: clerkOAuthStrategy(methodId) as never,
      redirectUrl,
    });
    if (created.error) return clerkErrorResult(created.error.message);

    const externalRedirectUrl =
      signIn.firstFactorVerification.externalVerificationRedirectURL;
    if (!externalRedirectUrl) {
      return {
        ok: false,
        error: "Clerk did not provide an SSO redirect URL.",
      };
    }

    const browserResult = await openAuthSession(
      externalRedirectUrl.toString(),
      redirectUrl,
    );
    if (browserResult.type !== "success") {
      return { ok: false, error: "The sign-in flow was cancelled." };
    }
    if (!isExpectedOAuthCallbackUrl(browserResult.url, redirectUrl)) {
      return {
        ok: false,
        error:
          "The Clerk sign-in callback did not return to the configured app link.",
      };
    }

    const rotatingTokenNonce = getOAuthCallbackParam(
      browserResult.url,
      "rotating_token_nonce",
    );
    if (!rotatingTokenNonce) {
      return {
        ok: false,
        error: "The Clerk sign-in callback did not include a session nonce.",
      };
    }

    const reloaded = await client.signIn.reload({ rotatingTokenNonce });
    const currentSignIn = reloaded.__internal_future;
    if (
      currentSignIn.isTransferable === true ||
      currentSignIn.firstFactorVerification.status === "transferable"
    ) {
      return {
        ok: false,
        error: "No existing Clerk account was found for this sign-in method.",
      };
    }

    if (currentSignIn.status === "complete") {
      return finalizeClerkSignIn(currentSignIn);
    }

    if (
      currentSignIn.status === "needs_second_factor" ||
      currentSignIn.status === "needs_client_trust"
    ) {
      return { ok: true };
    }

    if (currentSignIn.existingSession && setActive) {
      await setActive({ session: currentSignIn.existingSession.sessionId });
      return { ok: true };
    }

    return {
      ok: false,
      error: `Clerk sign-in is not complete (status: ${currentSignIn.status}).`,
    };
  } catch (error) {
    return clerkErrorResult(errorMessage(error, "Clerk"));
  }
}

export function clerkErrorResult(message: string | undefined): AdminAuthResult {
  return {
    ok: false,
    error:
      message ||
      "Clerk authentication failed. Check the details and try again.",
  };
}

export interface ConvexAuthSignInResult {
  signingIn: boolean;
  redirect?: URL;
}

export type ConvexAuthSignIn = (
  provider: string,
  params?: {
    flow?: "signIn";
    email?: string;
    password?: string;
    code?: string;
    redirectTo?: string;
  },
) => Promise<ConvexAuthSignInResult>;

export type OpenAuthSession = (
  url: string,
  redirectUrl: string,
) => Promise<{ type: string; url?: string }>;

/**
 * Execute the native Convex Auth password, email-code, and OAuth flows using
 * the IDs configured by the host deployment.
 */
export async function signInWithConvexAuth(
  request: AdminAuthSignInRequest,
  providerIds: ConvexAuthProviderIds,
  signIn: ConvexAuthSignIn,
  options?: {
    redirectUri?: string;
    openAuthSession?: OpenAuthSession;
  },
): Promise<AdminAuthResult> {
  if (request.kind === "password") {
    if (!providerIds.password) {
      return {
        ok: false,
        error: "No Convex Auth provider ID is configured for password sign-in.",
      };
    }
    return callConvexAuth(
      () =>
        signIn(providerIds.password, {
          flow: "signIn",
          email: request.identifier.trim(),
          password: request.password,
        }),
      "password",
    );
  }

  if (request.kind === "email-code") {
    if (!providerIds.emailCode) {
      return {
        ok: false,
        error:
          "No Convex Auth provider ID is configured for email-code sign-in.",
      };
    }
    return callConvexAuth(
      () =>
        signIn(providerIds.emailCode, {
          email: request.email.trim(),
          ...(request.code ? { code: request.code.trim() } : {}),
        }),
      "email-code",
    );
  }

  if (request.kind !== "sso") {
    return {
      ok: false,
      error: "This Convex Auth deployment does not expose an MFA adapter yet.",
    };
  }

  const providerId = providerIds.sso[request.method.id];
  if (!providerId) {
    return {
      ok: false,
      error: `No Convex Auth provider ID is configured for ${request.method.label}.`,
    };
  }
  if (!options?.redirectUri || !options.openAuthSession) {
    return { ok: false, error: "Native OAuth support is not configured." };
  }

  let firstStep: ConvexAuthSignInResult;
  try {
    firstStep = await signIn(providerId, {
      redirectTo: options.redirectUri,
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error, "SSO") };
  }
  if (!firstStep.redirect) return { ok: true };

  let browserResult: { type: string; url?: string };
  try {
    browserResult = await options.openAuthSession(
      firstStep.redirect.toString(),
      options.redirectUri,
    );
  } catch (error) {
    return { ok: false, error: errorMessage(error, "SSO") };
  }
  if (browserResult.type !== "success") {
    return { ok: false, error: "The sign-in flow was cancelled." };
  }

  if (!isExpectedOAuthCallbackUrl(browserResult.url, options.redirectUri)) {
    return {
      ok: false,
      error: "The sign-in callback did not return to the configured app link.",
    };
  }

  const code = getOAuthCallbackCode(browserResult.url);
  if (!code) {
    return {
      ok: false,
      error: "The sign-in callback did not include a code.",
    };
  }

  return callConvexAuth(
    () =>
      signIn(providerId, {
        code,
        redirectTo: options.redirectUri,
      }),
    "SSO",
  );
}

export function getOAuthCallbackCode(url: string | undefined): string | null {
  return getOAuthCallbackParam(url, "code");
}

export function getOAuthCallbackParam(
  url: string | undefined,
  name: string,
): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get(name);
  } catch {
    return null;
  }
}

export function isExpectedOAuthCallbackUrl(
  url: string | undefined,
  redirectUrl: string,
): boolean {
  if (!url) return false;
  try {
    const actual = new URL(url);
    const expected = new URL(redirectUrl);
    return (
      actual.protocol === expected.protocol &&
      actual.host === expected.host &&
      actual.pathname === expected.pathname
    );
  } catch {
    return false;
  }
}

async function callConvexAuth(
  operation: () => Promise<ConvexAuthSignInResult>,
  method: string,
): Promise<AdminAuthResult> {
  try {
    await operation();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, method) };
  }
}

function errorMessage(error: unknown, method: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return `${method} authentication failed. Check the details and try again.`;
}
