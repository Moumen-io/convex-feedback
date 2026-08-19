import type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatus,
} from "../component/model.js";

/**
 * Entry-related component configuration.
 */
export interface FeedbackEntriesConfig {
  /**
   * Entry kinds that may be created through this component instance.
   *
   * @default ["feedback", "feature_request", "bug_report"]
   */
  enabledKinds: readonly EntryKind[];

  /**
   * Status assigned to newly created entries.
   *
   * @default "open"
   */
  defaultStatus: EntryStatus;

  /**
   * Default server-side entry ordering when callers do not specify `sort`.
   *
   * @default "top"
   */
  defaultSort: EntrySort;

  /**
   * Maximum number of entries a caller may request in one pagination batch.
   *
   * Larger requested page sizes are clamped to this value.
   *
   * @default 50
   */
  maxPageSize: number;

  /**
   * Whether entry authors may edit their own title and body.
   *
   * Moderators are governed separately by the resolved actor permissions.
   *
   * @default true
   */
  editableByAuthor: boolean;
}

/**
 * Comment and reply configuration.
 */
export interface FeedbackCommentsConfig {
  /**
   * Maximum allowed nesting depth.
   *
   * Top-level comments have depth `0`. Attempts to create replies deeper than
   * this limit are rejected by the component.
   *
   * @default 5
   */
  maxDepth: number;

  /**
   * Maximum number of comments or replies that may be requested in one
   * pagination batch.
   *
   * @default 50
   */
  maxPageSize: number;

  /**
   * Default server-side comment ordering.
   *
   * @default "top"
   */
  defaultSort: CommentSort;

  /**
   * Whether comment authors may edit their own comments.
   *
   * @default true
   */
  editableByAuthor: boolean;

  /**
   * Whether comment authors may soft-delete their own comments.
   *
   * Deletion preserves the document so nested replies retain their structure.
   *
   * @default true
   */
  deletableByAuthor: boolean;
}

/**
 * Full-text search and duplicate-detection configuration.
 */
export interface FeedbackSearchConfig {
  /**
   * Whether similar/duplicate suggestions are enabled.
   *
   * When disabled, duplicate-search queries return empty `exact` and
   * `similar` arrays.
   *
   * @default true
   */
  duplicateSuggestions: boolean;

  /**
   * Default combined result limit for duplicate suggestions when the caller
   * does not provide `limit`.
   *
   * Exact matches consume this limit before similar matches.
   *
   * @default 5
   */
  duplicateSuggestionLimit: number;

  /**
   * Default result limit for normal full-text entry search.
   *
   * @default 20
   */
  defaultLimit: number;

  /**
   * Maximum allowed result limit for search and duplicate queries.
   *
   * Larger requested limits are clamped to this value.
   *
   * @default 50
   */
  maxLimit: number;
}

/**
 * Maximum lengths accepted for user-generated content.
 */
export interface FeedbackContentLimits {
  /**
   * Maximum entry-title length.
   *
   * @default 160
   */
  titleLength: number;

  /**
   * Maximum entry-body length.
   *
   * @default 10000
   */
  bodyLength: number;

  /**
   * Maximum comment/reply length.
   *
   * @default 5000
   */
  commentLength: number;
}

/**
 * Complete server-side configuration for a feedback component instance.
 *
 * Configuration is supplied by the host application and is not persisted in
 * an additional component table.
 */
export interface FeedbackConfig {
  /** Entry creation, ordering, pagination, and editing rules. */
  entries: FeedbackEntriesConfig;

  /** Comment nesting, ordering, pagination, and editing rules. */
  comments: FeedbackCommentsConfig;

  /** Search and duplicate-detection behavior. */
  search: FeedbackSearchConfig;

  /** User-generated content limits. */
  limits: FeedbackContentLimits;
}

/**
 * Partial configuration accepted by `createFeedbackConfig` and
 * `exposeFeedbackApi`.
 *
 * Missing values fall back to `defaultFeedbackConfig`.
 */
export interface FeedbackConfigOverrides {
  /** Overrides for entry configuration. */
  entries?: Partial<FeedbackEntriesConfig>;

  /** Overrides for comment configuration. */
  comments?: Partial<FeedbackCommentsConfig>;

  /** Overrides for search configuration. */
  search?: Partial<FeedbackSearchConfig>;

  /** Overrides for content limits. */
  limits?: Partial<FeedbackContentLimits>;
}

export const defaultFeedbackConfig: FeedbackConfig = {
  entries: {
    enabledKinds: ["feedback", "feature_request", "bug_report"],
    defaultStatus: "open",
    defaultSort: "top",
    maxPageSize: 50,
    editableByAuthor: true,
  },
  comments: {
    maxDepth: 5,
    maxPageSize: 50,
    defaultSort: "top",
    editableByAuthor: true,
    deletableByAuthor: true,
  },
  search: {
    duplicateSuggestions: true,
    duplicateSuggestionLimit: 5,
    defaultLimit: 20,
    maxLimit: 50,
  },
  limits: {
    titleLength: 160,
    bodyLength: 10_000,
    commentLength: 5_000,
  },
};

export function createFeedbackConfig(
  overrides: FeedbackConfigOverrides = {},
): FeedbackConfig {
  return {
    entries: { ...defaultFeedbackConfig.entries, ...overrides.entries },
    comments: { ...defaultFeedbackConfig.comments, ...overrides.comments },
    search: { ...defaultFeedbackConfig.search, ...overrides.search },
    limits: { ...defaultFeedbackConfig.limits, ...overrides.limits },
  };
}
