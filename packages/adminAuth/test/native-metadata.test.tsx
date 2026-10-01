import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ConvexReactClient } from "convex/react";

const runtimeMocks = vi.hoisted(() => ({
  secureStore: new Map<string, string>(),
  clerkAuth: {
    isLoaded: true,
    isSignedIn: false,
    signOut: vi.fn(() => Promise.resolve()),
    getToken: vi.fn(() => Promise.resolve("clerk-token")),
  },
  convexAuth: { isLoading: false, isAuthenticated: false },
  userState: {
    isLoaded: false,
    user: null as {
      fullName?: string | null;
      username?: string | null;
      primaryEmailAddress?: { emailAddress: string } | null;
      imageUrl?: string;
    } | null,
  },
  signInWithClerkSso: vi.fn(() => Promise.resolve({ ok: true as const })),
}));

vi.mock("@clerk/expo", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => runtimeMocks.clerkAuth,
  useClerk: () => ({
    client: {},
    setActive: vi.fn(() => Promise.resolve()),
  }),
  useSignIn: () => ({ signIn: {} }),
  useUser: () => runtimeMocks.userState,
}));

vi.mock("@clerk/expo/native", () => ({ UserProfileView: () => null }));

vi.mock("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
  useAuthToken: () => null,
  useConvexAuth: () => runtimeMocks.convexAuth,
}));

vi.mock("convex/react", () => ({
  ConvexProvider: ({ children }: { children: ReactNode }) => children,
  useConvexAuth: () => runtimeMocks.convexAuth,
}));

vi.mock("convex/react-clerk", () => ({
  ConvexProviderWithClerk: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn((key: string) =>
    Promise.resolve(runtimeMocks.secureStore.get(key) ?? null),
  ),
  setItemAsync: vi.fn((key: string, value: string) => {
    runtimeMocks.secureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    runtimeMocks.secureStore.delete(key);
    return Promise.resolve();
  }),
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));

vi.mock("react-native", () => ({ View: "View" }));

vi.mock("../src/native-callback.js", () => ({
  getNativeAuthCallbackUrl: () => "convex-feedback://auth-callback",
}));

vi.mock("../src/flows.js", () => ({
  clerkErrorResult: vi.fn(),
  completeClerkSignIn: vi.fn(),
  finalizeClerkSignIn: vi.fn(),
  mapClerkMfaMethods: vi.fn(() => []),
  signInWithClerkSso: runtimeMocks.signInWithClerkSso,
  signInWithConvexAuth: vi.fn(),
}));

import { AdminAuthRuntime, useAdminAuth } from "../src/native.js";
import type {
  AdminAuthController,
  AdminProjectConfig,
} from "../src/contracts.js";
import { getProjectAuthMetadataKey } from "../src/storage.js";

const project: AdminProjectConfig = {
  id: "clerk-project",
  name: "Clerk project",
  convexUrl: "https://example.convex.cloud",
  apiNamespace: "feedback",
  auth: {
    provider: "clerk",
    publicConfig: {
      publishableKey: "pk_test_project_instance",
      methods: { sso: [{ id: "google", label: "Google" }] },
    },
  },
  updatedAt: 1,
};

let controller: AdminAuthController | undefined;
let renderer: ReactTestRenderer | undefined;

function AuthProbe() {
  controller = useAdminAuth();
  return null;
}

function RuntimeTree() {
  return (
    <AdminAuthRuntime project={project} client={{} as ConvexReactClient}>
      <AuthProbe />
    </AdminAuthRuntime>
  );
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Clerk last-used metadata", () => {
  beforeEach(() => {
    controller = undefined;
    renderer = undefined;
    runtimeMocks.secureStore.clear();
    runtimeMocks.clerkAuth.isSignedIn = false;
    runtimeMocks.convexAuth.isAuthenticated = false;
    runtimeMocks.userState.isLoaded = false;
    runtimeMocks.userState.user = null;
    runtimeMocks.signInWithClerkSso.mockClear();
  });

  it("waits for the Clerk user to load before saving an SSO email", async () => {
    await act(async () => {
      renderer = create(<RuntimeTree />);
      await Promise.resolve();
    });

    const ssoRequest = {
      kind: "sso" as const,
      method: { id: "google", label: "Google" },
    };
    await act(async () => {
      const result = await controller?.signIn(ssoRequest);
      expect(result).toEqual({ ok: true });
    });

    runtimeMocks.clerkAuth.isSignedIn = true;
    runtimeMocks.convexAuth.isAuthenticated = true;
    await act(async () => {
      renderer?.update(<RuntimeTree />);
      await Promise.resolve();
    });

    const metadataKey = getProjectAuthMetadataKey(project.id);
    expect(runtimeMocks.secureStore.has(metadataKey)).toBe(false);

    runtimeMocks.userState.isLoaded = true;
    runtimeMocks.userState.user = {
      primaryEmailAddress: { emailAddress: "admin@example.com" },
    };
    await act(async () => {
      renderer?.update(<RuntimeTree />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const stored = runtimeMocks.secureStore.get(metadataKey);
    expect(stored).toBeDefined();
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      provider: "clerk",
      method: { kind: "sso", id: "google" },
      email: "admin@example.com",
    });
  });
});
