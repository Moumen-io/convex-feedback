import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";

import type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatus,
  EntryStatusFilter,
  FeedbackComment,
  FeedbackActivityComment,
  FeedbackActivityEntry,
  FeedbackEntry,
  FeedbackReaction,
  FeedbackMetadata,
  AdminFeedbackEntry,
  EntryPriority,
  RoadmapItem,
  RoadmapStatus,
  SimilarEntriesResult,
} from "../component/model.js";

/**
 * Arguments for cursor-paginated entry listing.
 */
export type ListEntriesArgs = {
  /**
   * Convex cursor-pagination options.
   *
   * React consumers normally do not construct this directly; `useEntries`
   * manages it through `usePaginatedQuery`.
   */
  paginationOpts: PaginationOptions;

  /**
   * Entry kinds to include.
   *
   * Filtering is performed by Convex before pagination. Omit this field to
   * include every kind.
   *
   * Must contain at least one kind when provided.
   */
  kinds?: EntryKind[];

  /** Restricts entries to this workflow status. */
  status?: EntryStatus;

  /** Restricts entries to the indexed open or closed board bucket. */
  statusFilter?: EntryStatusFilter;

  /**
   * Server-side ordering strategy.
   *
   * When omitted, `config.entries.defaultSort` is used.
   */
  sort?: EntrySort;
};

/** Arguments for cursor-paginated entries created by the current actor. */
export type ListUserEntriesArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;
};

/**
 * Arguments for retrieving one entry.
 */
export type GetEntryArgs = {
  /** Identifier returned by the component for the requested entry. */
  entryId: string;
};

/**
 * Arguments for full-text entry search.
 */
export type SearchEntriesArgs = {
  /** Full-text query matched against the entry's indexed search text. */
  searchQuery: string;

  /**
   * Entry kinds to include.
   *
   * Filtering occurs inside the Convex query rather than after results reach
   * the client.
   */
  kinds?: EntryKind[];

  /** Optional workflow-status restriction. */
  status?: EntryStatus;

  /** Optional indexed open or closed board bucket. */
  statusFilter?: EntryStatusFilter;

  /**
   * Maximum number of results to return.
   *
   * When omitted, `config.search.defaultLimit` is used. The server clamps the
   * value to `config.search.maxLimit`.
   */
  limit?: number;
};

/**
 * Arguments for exact/similar duplicate detection.
 */
export type FindSimilarEntriesArgs = {
  /**
   * Proposed entry title.
   *
   * Its normalized form is used for exact duplicate detection.
   */
  title: string;

  /**
   * Proposed entry body.
   *
   * Combined with the title for the full-text similarity search.
   */
  body: string;

  /**
   * Restricts duplicate detection to one entry kind.
   *
   * Omit to search every kind.
   */
  kind?: EntryKind;

  /**
   * Maximum combined number of suggestions returned.
   *
   * Exact normalized-title matches consume this limit first. Only remaining
   * slots are available to full-text matches.
   *
   * Therefore:
   *
   * `result.exact.length + result.similar.length <= limit`
   *
   * When omitted, `config.search.duplicateSuggestionLimit` is used.
   */
  limit?: number;
};

/**
 * Arguments for creating an entry.
 */
export type CreateEntryArgs = {
  /** Category of entry to create. */
  kind: EntryKind;

  /** Entry title. */
  title: string;

  /** Entry description/body. */
  body: string;

  /** Optional creation-time diagnostic metadata. */
  metadata?: FeedbackMetadata;
};

/**
 * Arguments for editing an existing entry.
 */
export type UpdateEntryArgs = {
  /** Entry to update. */
  entryId: string;

  /** Optional replacement category. Omit to keep the current category. */
  kind?: EntryKind;

  /** Complete replacement title. */
  title: string;

  /** Complete replacement body. */
  body: string;
};

/**
 * Arguments for permanently deleting an entry as an administrator.
 *
 * Deletion hides the entry immediately and finishes dependent-document
 * cleanup in bounded scheduled batches before the entry is hard-deleted.
 */
export type DeleteEntryArgs = {
  /** Entry to delete. */
  entryId: string;
};

/**
 * Arguments for changing an entry workflow status.
 */
export type SetEntryStatusArgs = {
  /** Entry whose status should change. */
  entryId: string;

  /** Desired workflow status. */
  status: EntryStatus;
};

export type AdminListEntriesArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;
  kinds?: EntryKind[];
  status?: EntryStatus;
  priority?: EntryPriority;
};

export type AdminSearchEntriesArgs = AdminListEntriesArgs & {
  searchQuery: string;
};

export type SetEntryPriorityArgs = {
  entryId: string;
  priority: EntryPriority | null;
};

export type ListRoadmapArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;
  status?: RoadmapStatus;
};
export type GetRoadmapItemArgs = {
  /** Identifier returned by the component for the requested roadmap item. */
  roadmapId: string;
};
export type SearchRoadmapArgs = { searchQuery: string; limit?: number };
export type CreateRoadmapArgs = {
  title: string;
  description?: string;
  status: RoadmapStatus;
};
export type CreateRoadmapForEntryArgs = CreateRoadmapArgs & {
  entryId: string;
};
export type UpdateRoadmapArgs = {
  roadmapId: string;
  title: string;
  description?: string;
};
export type DeleteRoadmapArgs = { roadmapId: string };
export type MoveRoadmapArgs = {
  roadmapId: string;
  status: RoadmapStatus;
  previousItemId?: string;
  nextItemId?: string;
};
export type AttachFeedbackToRoadmapArgs = {
  roadmapId: string;
  entryId: string;
};
export type DetachFeedbackFromRoadmapArgs = { entryId: string };
export type ListRoadmapFeedbackArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;
  roadmapId: string;
};

/**
 * Arguments for setting the current actor's entry-upvote state.
 */
export type SetEntryUpvoteArgs = {
  /** Entry whose upvote state should change. */
  entryId: string;

  /**
   * Desired final state.
   *
   * `true` ensures the current actor has an upvote.
   * `false` ensures the current actor does not have an upvote.
   *
   * This is intentionally state-setting rather than toggle semantics, making
   * the mutation idempotent and safe to retry.
   */
  desiredState: boolean;
};

/**
 * Authoritative entry-upvote state returned after a mutation.
 */
export type SetEntryUpvoteResult = {
  /** Final upvote state for the current actor. */
  active: boolean;

  /** Updated total number of entry upvotes. */
  upvoteCount: number;
};

/**
 * Arguments for cursor-paginated comment/reply listing.
 */
export type ListCommentsArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;

  /** Entry whose conversation should be queried. */
  entryId: string;

  /**
   * Direct parent comment.
   *
   * Omit to query top-level comments. When supplied, only direct children of
   * this comment are returned; deeper descendants are not loaded.
   */
  parentCommentId?: string;

  /**
   * Server-side comment ordering strategy.
   *
   * When omitted, `config.comments.defaultSort` is used.
   */
  sort?: CommentSort;
};

/** Arguments for cursor-paginated comments created by the current actor. */
export type ListUserCommentsArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;
};

/** Arguments for cursor-paginated reactions created by the current actor. */
export type ListUserReactionsArgs = {
  /** Convex cursor-pagination options. */
  paginationOpts: PaginationOptions;
};

/**
 * Arguments for creating a top-level comment or reply.
 */
export type CreateCommentArgs = {
  /** Entry the comment belongs to. */
  entryId: string;

  /**
   * Direct parent comment.
   *
   * Omit to create a top-level comment.
   */
  parentCommentId?: string;

  /** Comment/reply text. */
  body: string;
};

/**
 * Arguments for editing a comment.
 */
export type UpdateCommentArgs = {
  /** Comment to edit. */
  commentId: string;

  /** Complete replacement body. */
  body: string;
};

/** Arguments for permanently deleting a comment and its descendants. */
export type DeleteCommentArgs = {
  /** Comment subtree to delete. */
  commentId: string;
};

/**
 * Arguments for setting the current actor's comment-like state.
 */
export type SetCommentLikeArgs = {
  /** Comment whose like state should change. */
  commentId: string;

  /**
   * Desired final state.
   *
   * `true` ensures the actor likes the comment.
   * `false` ensures the actor does not like the comment.
   *
   * This is idempotent rather than toggle-based.
   */
  desiredState: boolean;
};

/**
 * Authoritative comment-like state returned after a mutation.
 */
export type SetCommentLikeResult = {
  /** Final like state for the current actor. */
  active: boolean;

  /** Updated total number of comment likes. */
  likeCount: number;
};

/**
 * Public Convex API exposed by `exposeFeedbackApi`.
 *
 * The host application exposes these wrappers from its own Convex deployment
 * after resolving authentication and configuration.
 *
 * @typeParam RateLimitResult A validated rejection value returned by mutations
 * when non-throwing rate limiting is configured. The default `never` preserves
 * the original success-only mutation results.
 * @typeParam CallbackRejectionResult A validated rejection value returned only
 * by create mutations when callback return mode is configured.
 */
export interface FeedbackPublicApi<
  Name extends string | undefined = string | undefined,
  RateLimitResult = never,
  CallbackRejectionResult = never,
> {
  /** Returns whether the host actor has admin permissions. */
  isAdmin: FunctionReference<
    "query",
    "public",
    Record<string, never>,
    boolean,
    Name
  >;

  /** Returns whether the current request has an authenticated host actor. */
  isAuthenticated: FunctionReference<
    "query",
    "public",
    Record<string, never>,
    boolean,
    Name
  >;

  /** Returns a cursor-paginated entry list. */
  listEntries: FunctionReference<
    "query",
    "public",
    ListEntriesArgs,
    PaginationResult<FeedbackEntry>,
    Name
  >;

  /** Returns entries created by the authenticated actor. */
  listUserEntries: FunctionReference<
    "query",
    "public",
    ListUserEntriesArgs,
    PaginationResult<FeedbackActivityEntry>,
    Name
  >;

  /** Returns one entry or `null` when it does not exist. */
  getEntry: FunctionReference<
    "query",
    "public",
    GetEntryArgs,
    FeedbackEntry | null,
    Name
  >;

  /** Performs full-text entry search. */
  searchEntries: FunctionReference<
    "query",
    "public",
    SearchEntriesArgs,
    FeedbackEntry[],
    Name
  >;

  /** Finds exact and likely duplicate entries. */
  findSimilarEntries: FunctionReference<
    "query",
    "public",
    FindSimilarEntriesArgs,
    SimilarEntriesResult,
    Name
  >;

  /** Creates an entry, returning its identifier or a rate-limit rejection. */
  createEntry: FunctionReference<
    "mutation",
    "public",
    CreateEntryArgs,
    string | RateLimitResult | CallbackRejectionResult,
    Name
  >;

  /** Replaces entry content, or returns a configured rate-limit rejection. */
  updateEntry: FunctionReference<
    "mutation",
    "public",
    UpdateEntryArgs,
    null | RateLimitResult,
    Name
  >;

  /** Starts permanent entry deletion; cleanup runs in bounded background batches. */
  deleteEntry: FunctionReference<
    "mutation",
    "public",
    DeleteEntryArgs,
    null | RateLimitResult,
    Name
  >;

  /** Changes entry status, or returns a configured rate-limit rejection. */
  setEntryStatus: FunctionReference<
    "mutation",
    "public",
    SetEntryStatusArgs,
    null | RateLimitResult,
    Name
  >;

  adminListEntries: FunctionReference<
    "query",
    "public",
    AdminListEntriesArgs,
    PaginationResult<AdminFeedbackEntry>,
    Name
  >;
  adminGetEntry: FunctionReference<
    "query",
    "public",
    GetEntryArgs,
    AdminFeedbackEntry | null,
    Name
  >;
  adminSearchEntries: FunctionReference<
    "query",
    "public",
    AdminSearchEntriesArgs,
    PaginationResult<AdminFeedbackEntry>,
    Name
  >;
  setEntryPriority: FunctionReference<
    "mutation",
    "public",
    SetEntryPriorityArgs,
    null | RateLimitResult,
    Name
  >;

  listRoadmap: FunctionReference<
    "query",
    "public",
    ListRoadmapArgs,
    PaginationResult<RoadmapItem>,
    Name
  >;
  /** Returns one roadmap item or `null` when it does not exist. */
  getRoadmapItem: FunctionReference<
    "query",
    "public",
    GetRoadmapItemArgs,
    RoadmapItem | null,
    Name
  >;
  searchRoadmap: FunctionReference<
    "query",
    "public",
    SearchRoadmapArgs,
    RoadmapItem[],
    Name
  >;
  createRoadmap: FunctionReference<
    "mutation",
    "public",
    CreateRoadmapArgs,
    string | RateLimitResult,
    Name
  >;
  createRoadmapForEntry: FunctionReference<
    "mutation",
    "public",
    CreateRoadmapForEntryArgs,
    string | RateLimitResult,
    Name
  >;
  updateRoadmap: FunctionReference<
    "mutation",
    "public",
    UpdateRoadmapArgs,
    null | RateLimitResult,
    Name
  >;
  deleteRoadmap: FunctionReference<
    "mutation",
    "public",
    DeleteRoadmapArgs,
    null | RateLimitResult,
    Name
  >;
  moveRoadmapItem: FunctionReference<
    "mutation",
    "public",
    MoveRoadmapArgs,
    number | RateLimitResult,
    Name
  >;
  attachFeedbackToRoadmap: FunctionReference<
    "mutation",
    "public",
    AttachFeedbackToRoadmapArgs,
    null | RateLimitResult,
    Name
  >;
  detachFeedbackFromRoadmap: FunctionReference<
    "mutation",
    "public",
    DetachFeedbackFromRoadmapArgs,
    null | RateLimitResult,
    Name
  >;
  listRoadmapFeedback: FunctionReference<
    "query",
    "public",
    ListRoadmapFeedbackArgs,
    PaginationResult<FeedbackEntry>,
    Name
  >;

  /** Sets entry-upvote state, or returns a configured rate-limit rejection. */
  setEntryUpvote: FunctionReference<
    "mutation",
    "public",
    SetEntryUpvoteArgs,
    SetEntryUpvoteResult | RateLimitResult,
    Name
  >;

  /** Returns one paginated level of comments or replies. */
  listComments: FunctionReference<
    "query",
    "public",
    ListCommentsArgs,
    PaginationResult<FeedbackComment>,
    Name
  >;

  /** Returns comments created by the authenticated actor. */
  listUserComments: FunctionReference<
    "query",
    "public",
    ListUserCommentsArgs,
    PaginationResult<FeedbackActivityComment>,
    Name
  >;

  /** Returns reactions created by the authenticated actor. */
  listUserReactions: FunctionReference<
    "query",
    "public",
    ListUserReactionsArgs,
    PaginationResult<FeedbackReaction>,
    Name
  >;

  /** Creates a comment/reply, returning its ID or a rate-limit rejection. */
  createComment: FunctionReference<
    "mutation",
    "public",
    CreateCommentArgs,
    string | RateLimitResult | CallbackRejectionResult,
    Name
  >;

  /** Replaces comment content, or returns a configured rate-limit rejection. */
  updateComment: FunctionReference<
    "mutation",
    "public",
    UpdateCommentArgs,
    null | RateLimitResult,
    Name
  >;

  /** Permanently deletes a comment subtree, or returns a configured rate-limit rejection. */
  deleteComment: FunctionReference<
    "mutation",
    "public",
    DeleteCommentArgs,
    null | RateLimitResult,
    Name
  >;

  /** Sets comment-like state, or returns a configured rate-limit rejection. */
  setCommentLike: FunctionReference<
    "mutation",
    "public",
    SetCommentLikeArgs,
    SetCommentLikeResult | RateLimitResult,
    Name
  >;
}
