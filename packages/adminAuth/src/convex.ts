import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { FeedbackPublicApi } from "convex-feedback";

import {
  isValidConvexUrl,
  isValidNamespace,
  normalizeApiNamespace,
  normalizeConvexUrl,
} from "./config.js";
import type { AdminProjectConfig } from "./contracts.js";

export type RuntimeFeedbackApi = FeedbackPublicApi<string | undefined, never>;

export type ConvexAdminConnectionQuery = (
  query: RuntimeFeedbackApi["isAdmin"],
  args: Record<string, never>,
) => Promise<unknown>;

export type ConvexAdminConnectionResult =
  | {
      ok: true;
      apiPath: string;
      isAdmin: boolean;
    }
  | {
      ok: false;
      stage: "configuration" | "deployment" | "endpoint";
      error: string;
    };

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

/**
 * Calls the host admin probe without requiring a signed-in session.
 *
 * `isAdmin` is intentionally a public query which returns `false` for an
 * unauthenticated caller. A successful `false` therefore proves that the
 * deployment and endpoint are configured; it does not grant access.
 */
export async function testConvexAdminConnection(
  input: Pick<AdminProjectConfig, "convexUrl" | "apiNamespace">,
  query?: ConvexAdminConnectionQuery,
): Promise<ConvexAdminConnectionResult> {
  const convexUrl = normalizeConvexUrl(input.convexUrl);
  const apiNamespace = normalizeApiNamespace(input.apiNamespace);
  const apiPath = `api.${apiNamespace}.isAdmin`;

  if (!isValidConvexUrl(convexUrl)) {
    return {
      ok: false,
      stage: "configuration",
      error:
        "Enter a valid Convex deployment URL without a path, query string, or fragment.",
    };
  }
  if (!apiNamespace || !isValidNamespace(apiNamespace)) {
    return {
      ok: false,
      stage: "configuration",
      error: "Enter a valid API namespace, such as feedback.",
    };
  }

  try {
    const result = await (query ?? createHttpConnectionQuery(convexUrl))(
      resolveConvexApiNamespace(apiNamespace).isAdmin,
      {},
    );
    if (typeof result !== "boolean") {
      return {
        ok: false,
        stage: "endpoint",
        error: `${apiPath} responded with an invalid result. It must return a boolean.`,
      };
    }
    return { ok: true, apiPath, isAdmin: result };
  } catch (error) {
    const detail = errorMessage(error);
    if (isLikelyNetworkError(detail)) {
      return {
        ok: false,
        stage: "deployment",
        error: `Could not reach the Convex deployment at ${convexUrl}. Check the URL and your network connection. ${detail}`,
      };
    }
    return {
      ok: false,
      stage: "endpoint",
      error: `Convex responded, but ${apiPath} could not be called. Export the complete feedback API from that namespace and deploy it. ${detail}`,
    };
  }
}

function createHttpConnectionQuery(
  convexUrl: string,
): ConvexAdminConnectionQuery {
  const client = new ConvexHttpClient(convexUrl, {
    logger: false,
    // The setup form also supports valid self-hosted HTTPS deployments.
    skipConvexDeploymentUrlCheck: true,
  });
  return (query, args) => client.query(query, args);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "The request failed without a detailed error.";
}

function isLikelyNetworkError(message: string): boolean {
  return /aborted|connection (?:refused|reset|timed out)|eai_again|econnrefused|enotfound|failed to fetch|fetch failed|network (?:error|request failed)|timeout|timed out|unable to connect/i.test(
    message,
  );
}
