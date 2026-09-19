import { describe, expect, it, vi } from "vitest";

import {
  clerkOAuthStrategy,
  completeClerkSignIn,
  getOAuthCallbackCode,
  isExpectedOAuthCallbackUrl,
  mapClerkMfaMethods,
  signInWithClerkSso,
  signInWithConvexAuth,
} from "../src/flows.js";
import type { ConvexAuthProviderIds } from "../src/contracts.js";

describe("Clerk custom sign-in flows", () => {
  it("finalizes a completed password, email-code, or MFA operation", async () => {
    const finalize = vi.fn(async () => ({ error: null }));

    for (const operation of [
      vi.fn(async () => ({ error: null })),
      vi.fn(async () => ({ error: null })),
      vi.fn(async () => ({ error: null })),
    ]) {
      const result = await completeClerkSignIn(
        { status: "complete", finalize },
        operation,
      );
      expect(result).toEqual({ ok: true });
    }

    expect(finalize).toHaveBeenCalledTimes(3);
  });

  it("leaves the second-factor and device-trust states for the challenge UI", async () => {
    const finalize = vi.fn(async () => ({ error: null }));
    const operation = vi.fn(async () => ({ error: null }));

    await expect(
      completeClerkSignIn(
        { status: "needs_second_factor", finalize },
        operation,
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      completeClerkSignIn(
        { status: "needs_client_trust", finalize },
        operation,
      ),
    ).resolves.toEqual({ ok: true });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("maps Clerk second factors, including email-link device trust", () => {
    expect(
      mapClerkMfaMethods([
        { strategy: "totp" },
        { strategy: "email_link" },
        { strategy: "email_code" },
        { strategy: "phone_code" },
        { strategy: "backup_code" },
      ]),
    ).toEqual([
      "totp",
      "email-link",
      "email-code",
      "phone-code",
      "backup-code",
    ]);
  });

  it("normalizes Clerk OAuth strategies", () => {
    expect(clerkOAuthStrategy("google")).toBe("oauth_google");
    expect(clerkOAuthStrategy("oauth_custom")).toBe("oauth_custom");
  });

  it.each([
    ["apple", "oauth_apple"],
    ["google", "oauth_google"],
  ])(
    "completes existing-account %s SSO without a sign-up transfer",
    async (methodId, strategy) => {
      const create = vi.fn(
        async (params: { strategy: unknown; redirectUrl: string }) => {
          expect(params).toEqual({
            strategy,
            redirectUrl: "convex-feedback-admin://auth/callback",
          });
          return { error: null };
        },
      );
      const finalize = vi.fn(async () => ({ error: null }));
      const currentSignIn = {
        status: "complete",
        finalize,
        create,
        firstFactorVerification: { status: "verified" },
        isTransferable: false,
      };
      const reload = vi.fn(async () => ({ __internal_future: currentSignIn }));
      const openAuthSession = vi.fn(async () => ({
        type: "success",
        url: "convex-feedback-admin://auth/callback?rotating_token_nonce=nonce",
      }));

      await expect(
        signInWithClerkSso(
          methodId,
          "convex-feedback-admin://auth/callback",
          {
            status: "needs_first_factor",
            finalize,
            create,
            firstFactorVerification: {
              externalVerificationRedirectURL: new URL(
                "https://clerk.example/oauth",
              ),
            },
          },
          { signIn: { reload } },
          openAuthSession,
        ),
      ).resolves.toEqual({ ok: true });
      expect(reload).toHaveBeenCalledWith({ rotatingTokenNonce: "nonce" });
      expect(finalize).toHaveBeenCalledOnce();
    },
  );

  it("rejects a transferable Clerk SSO result without finalizing", async () => {
    const finalize = vi.fn(async () => ({ error: null }));
    const currentSignIn = {
      status: "needs_first_factor",
      finalize,
      create: vi.fn(async () => ({ error: null })),
      firstFactorVerification: { status: "transferable" },
      isTransferable: true,
    };
    const signIn = {
      status: "needs_first_factor",
      finalize,
      create: vi.fn(async () => ({ error: null })),
      signUp: { create: vi.fn() },
      firstFactorVerification: {
        externalVerificationRedirectURL: new URL("https://clerk.example/oauth"),
      },
    };

    await expect(
      signInWithClerkSso(
        "apple",
        "convex-feedback-admin://auth/callback",
        signIn,
        {
          signIn: {
            reload: vi.fn(async () => ({ __internal_future: currentSignIn })),
          },
        },
        async () => ({
          type: "success",
          url: "convex-feedback-admin://auth/callback?rotating_token_nonce=nonce",
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: "No existing Clerk account was found for this sign-in method.",
    });
    expect(signIn.signUp.create).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("keeps Clerk MFA and cancellation states distinguishable", async () => {
    const finalize = vi.fn(async () => ({ error: null }));
    const signIn = {
      status: "needs_first_factor",
      finalize,
      create: vi.fn(async () => ({ error: null })),
      firstFactorVerification: {
        externalVerificationRedirectURL: new URL("https://clerk.example/oauth"),
      },
    };
    const currentSignIn = {
      status: "needs_second_factor",
      finalize,
      create: signIn.create,
      firstFactorVerification: { status: "verified" },
    };
    const client = {
      signIn: {
        reload: vi.fn(async () => ({ __internal_future: currentSignIn })),
      },
    };

    await expect(
      signInWithClerkSso(
        "google",
        "convex-feedback-admin://auth/callback",
        signIn,
        client,
        async () => ({
          type: "success",
          url: "convex-feedback-admin://auth/callback?rotating_token_nonce=nonce",
        }),
      ),
    ).resolves.toEqual({ ok: true });
    expect(finalize).not.toHaveBeenCalled();

    await expect(
      signInWithClerkSso(
        "google",
        "convex-feedback-admin://auth/callback",
        signIn,
        client,
        async () => ({ type: "cancel" }),
      ),
    ).resolves.toEqual({ ok: false, error: "The sign-in flow was cancelled." });
  });

  it("accepts only the configured callback scheme, host, and path", () => {
    expect(
      isExpectedOAuthCallbackUrl(
        "convex-feedback-admin://auth/callback?code=ok",
        "convex-feedback-admin://auth/callback",
      ),
    ).toBe(true);
    expect(
      isExpectedOAuthCallbackUrl(
        "other-app://auth/callback?code=ok",
        "convex-feedback-admin://auth/callback",
      ),
    ).toBe(false);
    expect(
      isExpectedOAuthCallbackUrl(
        "convex-feedback-admin://other-host/callback?code=ok",
        "convex-feedback-admin://auth/callback",
      ),
    ).toBe(false);
    expect(
      isExpectedOAuthCallbackUrl(
        "convex-feedback-admin://auth/other-path?code=ok",
        "convex-feedback-admin://auth/callback",
      ),
    ).toBe(false);
  });
});

describe("Convex Auth native sign-in flows", () => {
  const providerIds: ConvexAuthProviderIds = {
    password: "password-for-admins",
    emailCode: "email-code-for-admins",
    sso: { google: "host-google-provider" },
  };

  it("uses the configured password and email-code IDs", async () => {
    const calls: Array<[string, unknown]> = [];
    const signIn = vi.fn(async (provider: string, params?: unknown) => {
      calls.push([provider, params]);
      return { signingIn: true };
    });

    await expect(
      signInWithConvexAuth(
        {
          kind: "password",
          identifier: " admin@example.com ",
          password: "secret",
        },
        providerIds,
        signIn,
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      signInWithConvexAuth(
        { kind: "email-code", email: " admin@example.com ", code: " 123456 " },
        providerIds,
        signIn,
      ),
    ).resolves.toEqual({ ok: true });

    expect(calls).toEqual([
      [
        "password-for-admins",
        { flow: "signIn", email: "admin@example.com", password: "secret" },
      ],
      ["email-code-for-admins", { email: "admin@example.com", code: "123456" }],
    ]);
  });

  it("rejects enabled methods without a configured provider ID", async () => {
    const signIn = vi.fn(async () => ({ signingIn: true }));
    await expect(
      signInWithConvexAuth(
        {
          kind: "password",
          identifier: "admin@example.com",
          password: "secret",
        },
        { password: "", emailCode: "", sso: {} },
        signIn,
      ),
    ).resolves.toEqual({
      ok: false,
      error: "No Convex Auth provider ID is configured for password sign-in.",
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("maps the displayed SSO method to the host provider ID and exchanges the callback code", async () => {
    const calls: Array<[string, unknown]> = [];
    const signIn = vi.fn(async (provider: string, params?: unknown) => {
      calls.push([provider, params]);
      return calls.length === 1
        ? { signingIn: false, redirect: new URL("https://host.example/oauth") }
        : { signingIn: true };
    });
    const openAuthSession = vi.fn(async () => ({
      type: "success",
      url: "convex-feedback-admin://auth/callback?code=oauth-code",
    }));

    await expect(
      signInWithConvexAuth(
        { kind: "sso", method: { id: "google", label: "Google" } },
        providerIds,
        signIn,
        {
          redirectUri: "convex-feedback-admin://auth/callback",
          openAuthSession,
        },
      ),
    ).resolves.toEqual({ ok: true });
    expect(calls).toEqual([
      [
        "host-google-provider",
        { redirectTo: "convex-feedback-admin://auth/callback" },
      ],
      [
        "host-google-provider",
        {
          code: "oauth-code",
          redirectTo: "convex-feedback-admin://auth/callback",
        },
      ],
    ]);
    expect(openAuthSession).toHaveBeenCalledWith(
      "https://host.example/oauth",
      "convex-feedback-admin://auth/callback",
    );
  });

  it("does not silently fall back to a displayed SSO ID", async () => {
    const signIn = vi.fn(async () => ({ signingIn: true }));
    await expect(
      signInWithConvexAuth(
        { kind: "sso", method: { id: "github", label: "GitHub" } },
        providerIds,
        signIn,
      ),
    ).resolves.toEqual({
      ok: false,
      error: "No Convex Auth provider ID is configured for GitHub.",
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("rejects a cancelled or code-less callback", async () => {
    const signIn = vi.fn(async () => ({
      signingIn: false,
      redirect: new URL("https://host.example/oauth"),
    }));
    await expect(
      signInWithConvexAuth(
        { kind: "sso", method: { id: "google", label: "Google" } },
        providerIds,
        signIn,
        {
          redirectUri: "convex-feedback-admin://auth/callback",
          openAuthSession: async () => ({ type: "cancel" }),
        },
      ),
    ).resolves.toEqual({ ok: false, error: "The sign-in flow was cancelled." });
    expect(getOAuthCallbackCode("not a URL")).toBeNull();
  });

  it("rejects a Convex callback outside the configured app link", async () => {
    const signIn = vi.fn(async () => ({
      signingIn: false,
      redirect: new URL("https://host.example/oauth"),
    }));

    await expect(
      signInWithConvexAuth(
        { kind: "sso", method: { id: "google", label: "Google" } },
        providerIds,
        signIn,
        {
          redirectUri: "convex-feedback-admin://auth/callback",
          openAuthSession: async () => ({
            type: "success",
            url: "other-app://auth/callback?code=oauth-code",
          }),
        },
      ),
    ).resolves.toEqual({
      ok: false,
      error: "The sign-in callback did not return to the configured app link.",
    });
    expect(signIn).toHaveBeenCalledOnce();
  });
});
