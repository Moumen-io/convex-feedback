import { describe, expect, it, vi } from "vitest";

import {
  clerkOAuthStrategy,
  completeClerkSignIn,
  completeClerkSso,
  getOAuthCallbackCode,
  mapClerkMfaMethods,
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

  it("uses the experimental SSO result contract, which auto-finalizes", () => {
    expect(clerkOAuthStrategy("google")).toBe("oauth_google");
    expect(clerkOAuthStrategy("oauth_custom")).toBe("oauth_custom");
    expect(
      completeClerkSso({
        createdSessionId: "sess_1",
        authSessionResult: {
          type: "success",
          url: "convex-feedback-admin://auth/callback",
        },
      }),
    ).toEqual({ ok: true });
    expect(
      completeClerkSso({
        createdSessionId: null,
        authSessionResult: { type: "cancel" },
      }),
    ).toEqual({ ok: false, error: "The sign-in flow was cancelled." });
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
});
