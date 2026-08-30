import type { EntryKind, FeedbackMetadataValue } from "convex-feedback";

export type StandardMetadataKey =
  | "platform"
  | "userAgent"
  | "language"
  | "timezone"
  | "screenWidth"
  | "screenHeight"
  | "viewportWidth"
  | "viewportHeight"
  | "devicePixelRatio"
  | "osVersion"
  | "deviceModel"
  | "pixelRatio"
  | "fontScale"
  | "appVersion"
  | "buildNumber"
  | "applicationId"
  | "expoRuntimeVersion"
  | "executionEnvironment";

export type EnabledStandardMetadataSelection =
  true | readonly StandardMetadataKey[];

export type StandardMetadataSelection =
  false | EnabledStandardMetadataSelection;

export interface MetadataCollectionContext {
  kind: EntryKind;
}

export type AdditionalMetadata = Record<string, FeedbackMetadataValue>;

export type MetadataSource =
  | AdditionalMetadata
  | ((
      context: MetadataCollectionContext,
    ) => AdditionalMetadata | Promise<AdditionalMetadata>);

export interface MetadataCollectionOptions {
  /** Standard platform fields to collect. `true` selects platform defaults. */
  standard?: StandardMetadataSelection;

  /** Static or submission-time host metadata. */
  additional?: MetadataSource;
}

export interface MetadataCollectionConfig extends MetadataCollectionOptions {
  /** Per-entry-kind overrides. `false` disables all collection for that kind. */
  kinds?: Partial<Record<EntryKind, boolean | MetadataCollectionOptions>>;
}

/** Metadata collection configuration accepted by prebuilt feedback screens. */
export type CollectMetadata = boolean | MetadataCollectionConfig;
