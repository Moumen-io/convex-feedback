import type {
  EntryKind,
  FeedbackMetadata,
  FeedbackMetadataValue,
} from "convex-feedback";

import type {
  CollectMetadata,
  EnabledStandardMetadataSelection,
  MetadataCollectionContext,
  MetadataSource,
  StandardMetadataKey,
} from "./types/metadata.js";

export type StandardMetadataCollector = (
  selection: EnabledStandardMetadataSelection,
) => Partial<Record<StandardMetadataKey, FeedbackMetadataValue>>;

async function resolveAdditionalMetadata(
  source: MetadataSource | undefined,
  context: MetadataCollectionContext,
): Promise<Record<string, FeedbackMetadataValue>> {
  if (source === undefined) return {};

  try {
    return typeof source === "function" ? await source(context) : source;
  } catch {
    return {};
  }
}

export async function collectEntryMetadata(
  config: CollectMetadata | undefined,
  kind: EntryKind,
  collectStandard: StandardMetadataCollector,
): Promise<FeedbackMetadata | undefined> {
  if (config === undefined || config === false) return undefined;

  const root = config === true ? { standard: true as const } : config;
  const kindConfig = root.kinds?.[kind];
  if (kindConfig === false) return undefined;

  const kindOptions =
    kindConfig === true ? { standard: true as const } : kindConfig;
  const standardSelection = kindOptions?.standard ?? root.standard ?? false;
  const context = { kind } satisfies MetadataCollectionContext;
  const [globalAdditional, kindAdditional] = await Promise.all([
    resolveAdditionalMetadata(root.additional, context),
    resolveAdditionalMetadata(kindOptions?.additional, context),
  ]);

  let standard: FeedbackMetadata["standard"];
  try {
    standard =
      standardSelection === false
        ? undefined
        : collectStandard(standardSelection);
  } catch {
    standard = undefined;
  }

  const additional = { ...globalAdditional, ...kindAdditional };
  const hasStandard =
    standard !== undefined && Object.keys(standard).length > 0;
  const hasAdditional = Object.keys(additional).length > 0;

  if (!hasStandard && !hasAdditional) return undefined;

  return {
    ...(hasStandard ? { standard } : {}),
    ...(hasAdditional ? { additional } : {}),
  };
}

export function formatMetadataKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return words.length === 0
    ? key
    : words.charAt(0).toLocaleUpperCase("en-US") + words.slice(1);
}
