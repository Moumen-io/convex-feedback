import type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatus,
} from "../component/model.js";

export interface FeedbackConfig {
  entries: {
    enabledKinds: readonly EntryKind[];
    defaultStatus: EntryStatus;
    defaultSort: EntrySort;
    maxPageSize: number;
    editableByAuthor: boolean;
  };
  comments: {
    maxDepth: number;
    maxPageSize: number;
    defaultSort: CommentSort;
    editableByAuthor: boolean;
    deletableByAuthor: boolean;
  };
  search: {
    duplicateSuggestions: boolean;
    duplicateSuggestionLimit: number;
    defaultLimit: number;
    maxLimit: number;
  };
  limits: {
    titleLength: number;
    bodyLength: number;
    commentLength: number;
  };
}

export interface FeedbackConfigOverrides {
  entries?: Partial<FeedbackConfig["entries"]>;
  comments?: Partial<FeedbackConfig["comments"]>;
  search?: Partial<FeedbackConfig["search"]>;
  limits?: Partial<FeedbackConfig["limits"]>;
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
