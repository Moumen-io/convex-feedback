import type { Href } from "expo-router";
import type { FeedbackRouteNames } from "./types.js";

export const defaultFeedbackRoutes: FeedbackRouteNames = {
  board: "index",
  entry: "[entryId]",
  create: "new",
};

export function resolveFeedbackRoutes(
  routes: Partial<FeedbackRouteNames> = {},
): FeedbackRouteNames {
  const resolved = { ...defaultFeedbackRoutes, ...routes };

  if (!resolved.entry.includes("[entryId]")) {
    throw new Error(
      'The routed feedback entry route must contain the "[entryId]" dynamic segment.',
    );
  }

  return resolved;
}

export function createFeedbackStackSettings(
  routes?: Partial<FeedbackRouteNames>,
) {
  return { anchor: resolveFeedbackRoutes(routes).board };
}

export const feedbackStackSettings = createFeedbackStackSettings();

export function feedbackRouteHref(
  route: string,
  params?: Record<string, string>,
): Href {
  const pathname = route.startsWith(".") ? route : `./${route}`;
  return params === undefined ? pathname : { pathname, params };
}
