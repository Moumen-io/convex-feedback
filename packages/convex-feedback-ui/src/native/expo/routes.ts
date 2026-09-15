import type { Href } from "expo-router";
import type { RoadmapItem } from "convex-feedback";
import type { FeedbackRouteNames, RoadmapRouteNames } from "./types.js";

export const defaultFeedbackRoutes: FeedbackRouteNames = {
  board: "index",
  entry: "[entryId]",
  edit: "[entryId]/edit",
  create: "new",
};

export function resolveFeedbackRoutes(
  routes: Partial<FeedbackRouteNames> = {},
): FeedbackRouteNames {
  const resolved = {
    ...defaultFeedbackRoutes,
    ...routes,
    ...(routes.edit === undefined && routes.entry !== undefined
      ? { edit: `${routes.entry}/edit` }
      : {}),
  };

  if (!resolved.entry.includes("[entryId]")) {
    throw new Error(
      'The routed feedback entry route must contain the "[entryId]" dynamic segment.',
    );
  }
  if (!resolved.edit.startsWith(`${resolved.entry}/`)) {
    throw new Error(
      "The routed feedback edit route must be nested under the entry route.",
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

/** Anchor the create form to the feedback board. */
export const feedbackCreateStackSettings = { anchor: "index" };

export function feedbackRouteHref(
  route: string,
  params?: Record<string, string>,
): Href {
  const pathname = route.startsWith(".") ? route : `./${route}`;
  return params === undefined ? pathname : { pathname, params };
}

/** Build the edit child href from an entry-detail route. */
export function feedbackEditRouteHref(route: string): Href {
  const marker = "[entryId]";
  const markerIndex = route.indexOf(marker);
  const childRoute =
    markerIndex === -1
      ? ""
      : route.slice(markerIndex + marker.length).replace(/^\/+/, "");

  if (!childRoute) {
    throw new Error(
      'The routed feedback edit route must include a child segment after "[entryId]".',
    );
  }

  return feedbackRouteHref(childRoute);
}

/** Build a board href relative to an entry route at any configured depth. */
export function feedbackBoardRouteHref(
  entryRoute: string,
  boardRoute: string,
): Href {
  const entrySegments = entryRoute
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");
  const parentPrefix = "../".repeat(entrySegments.length);
  return feedbackRouteHref(`${parentPrefix}${boardRoute}`);
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
