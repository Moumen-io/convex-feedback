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
  FeedbackComment,
  FeedbackEntry,
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

  /**
   * Server-side ordering strategy.
   *
   * When omitted, `config.entries.defaultSort` is used.
   */
  sort?: EntrySort;
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
};

/**
 * Arguments for editing an existing entry.
 */
export type UpdateEntryArgs = {
  /** Entry to update. */
  entryId: string;

  /** Complete replacement title. */
  title: string;

  /** Complete replacement body. */
  body: string;
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

/**
 * Arguments for soft-deleting a comment.
 */
export type DeleteCommentArgs = {
  /** Comment to soft-delete. */
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
 */
export interface FeedbackPublicApi<
  Name extends string | undefined = string | undefined,
  RateLimitResult = never,
> {
  /** Returns a cursor-paginated entry list. */
  listEntries: FunctionReference<
    "query",
    "public",
    ListEntriesArgs,
    PaginationResult<FeedbackEntry>,
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
    string | RateLimitResult,
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

  /** Changes entry status, or returns a configured rate-limit rejection. */
  setEntryStatus: FunctionReference<
    "mutation",
    "public",
    SetEntryStatusArgs,
    null | RateLimitResult,
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

  /** Creates a comment/reply, returning its ID or a rate-limit rejection. */
  createComment: FunctionReference<
    "mutation",
    "public",
    CreateCommentArgs,
    string | RateLimitResult,
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

  /** Soft-deletes a comment, or returns a configured rate-limit rejection. */
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
