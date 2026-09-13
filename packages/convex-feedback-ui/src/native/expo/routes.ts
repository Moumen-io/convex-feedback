import type { Href } from "expo-router";
import type { RoadmapItem } from "convex-feedback";
import type { FeedbackRouteNames, RoadmapRouteNames } from "./types.js";

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

/** Anchor the create form beneath suggested-entry detail screens. */
export const feedbackCreateStackSettings = { anchor: "index" };

export function feedbackRouteHref(
  route: string,
  params?: Record<string, string>,
): Href {
  const pathname = route.startsWith(".") ? route : `./${route}`;
  return params === undefined ? pathname : { pathname, params };
}

export const defaultRoadmapRoutes: RoadmapRouteNames = {
  board: "index",
  item: "[roadmapId]",
};

export function resolveRoadmapRoutes(
  routes: Partial<RoadmapRouteNames> = {},
): RoadmapRouteNames {
  const resolved = { ...defaultRoadmapRoutes, ...routes };

  if (!resolved.item.includes("[roadmapId]")) {
    throw new Error(
      'The routed roadmap item route must contain the "[roadmapId]" dynamic segment.',
    );
  }

  return resolved;
}

export function createRoadmapStackSettings(
  routes?: Partial<RoadmapRouteNames>,
) {
  return { anchor: resolveRoadmapRoutes(routes).board };
}

export const roadmapStackSettings = createRoadmapStackSettings();

export function roadmapRouteHref(
  route: string,
  params?: Record<string, string>,
): Href {
  const pathname = route.startsWith(".") ? route : `./${route}`;
  return params === undefined ? pathname : { pathname, params };
}

/** Pass the already loaded item through a push so a detail route renders immediately. */
export function roadmapRouteParams(item: RoadmapItem) {
  return { roadmapId: item.id, item: JSON.stringify(item) };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRoadmapRouteItem(
  value: string | string[] | undefined,
): RoadmapItem | undefined {
  const serialized = firstParam(value);
  if (!serialized) return undefined;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object") return undefined;
    const item = parsed as Partial<RoadmapItem>;
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.status !== "string"
    ) {
      return undefined;
    }
    return item as RoadmapItem;
  } catch {
    return undefined;
  }
}
