import { describe, expect, it, vi } from "vitest";

const makeRedirectUri = vi.hoisted(() =>
  vi.fn(() => "convex-feedback-admin://auth/callback"),
);

vi.mock("expo-auth-session", () => ({ makeRedirectUri }));

import {
  getNativeAuthCallbackUrl,
  NATIVE_AUTH_CALLBACK_PATH,
} from "../src/native-callback.js";
import { signInWithClerkSso } from "../src/flows.js";

describe("native auth callback", () => {
  it("generates the callback through Expo AuthSession's shared source", () => {
    expect(getNativeAuthCallbackUrl()).toBe(
      "convex-feedback-admin://auth/callback",
    );
    expect(makeRedirectUri).toHaveBeenCalledWith({
      path: NATIVE_AUTH_CALLBACK_PATH,
    });
  });

  it("passes that generated callback to Clerk SSO", async () => {
    const redirectUrl = getNativeAuthCallbackUrl();
    const create = vi.fn(() => Promise.resolve({ error: null }));
    const finalize = vi.fn(() => Promise.resolve({ error: null }));
    const signIn = {
      status: "needs_first_factor",
      finalize,
      create,
      firstFactorVerification: {
        externalVerificationRedirectURL: new URL("https://clerk.example/oauth"),
      },
    };

    await expect(
      signInWithClerkSso(
        "google",
        redirectUrl,
        signIn,
        {
          signIn: {
            reload: vi.fn(() =>
              Promise.resolve({
                __internal_future: {
                  status: "complete",
                  finalize,
                  create,
                  firstFactorVerification: { status: "verified" },
                },
              }),
            ),
          },
        },
        () =>
          Promise.resolve({
            type: "success",
            url: `${redirectUrl}?rotating_token_nonce=nonce`,
          }),
      ),
    ).resolves.toEqual({ ok: true });

    expect(create).toHaveBeenCalledWith({
      strategy: "oauth_google",
      redirectUrl,
    });
  });
});
