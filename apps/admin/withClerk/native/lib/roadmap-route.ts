import type { RoadmapItem } from "convex-feedback";

export function roadmapRouteParams(item: RoadmapItem) {
  return {
    roadmapId: item.id,
    item: JSON.stringify(item),
  };
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
