import { anyApi } from "convex/server";
import type { FeedbackPublicApi } from "convex-feedback";

import { normalizeApiNamespace } from "./config.js";

export type RuntimeFeedbackApi = FeedbackPublicApi<string | undefined, never>;

/**
 * Resolves a host API namespace such as `feedback` or `feedback.admin` from
 * Convex's runtime `anyApi` proxy. No generated host API is required.
 */
export function resolveConvexApiNamespace(
  namespace: string,
): RuntimeFeedbackApi {
  const normalized = normalizeApiNamespace(namespace);
  if (!normalized) throw new Error("A Convex API namespace is required.");

  let current: unknown = anyApi;
  for (const segment of normalized.split(".")) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) {
      throw new Error(`Invalid Convex API namespace segment: ${segment}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current as RuntimeFeedbackApi;
}
