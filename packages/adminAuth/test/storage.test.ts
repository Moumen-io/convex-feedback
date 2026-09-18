import { describe, expect, it, vi } from "vitest";

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(async () => undefined),
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
}));

vi.mock("expo-secure-store", () => secureStore);

import {
  clearProjectAuthStorage,
  getConvexAuthStoredKey,
  getConvexAuthStorageNamespace,
} from "../src/storage.js";

describe("Convex Auth SecureStore namespacing", () => {
  it("matches Convex Auth's namespace escaping", () => {
    expect(getConvexAuthStorageNamespace("team-1")).toBe(
      "convex-feedback-admin-team-1",
    );
    expect(getConvexAuthStoredKey("team-1", "__convexAuthJWT")).toBe(
      "__convexAuthJWT_convexfeedbackadminteam1",
    );
  });

  it("clears the actual namespaced Convex Auth keys", async () => {
    await clearProjectAuthStorage("team-1");

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.__convexAuthJWT_convexfeedbackadminteam1",
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.__convexAuthOAuthVerifier_convexfeedbackadminteam1",
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      "convex-feedback-admin.team-1.clerk-active-session",
    );
  });
});
