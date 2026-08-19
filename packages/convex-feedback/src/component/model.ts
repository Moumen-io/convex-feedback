import type { Infer } from "convex/values";
import { v } from "convex/values";

export const entryKindValidator = v.union(
  v.literal("feedback"),
  v.literal("feature_request"),
  v.literal("bug_report"),
);

export const entryStatusValidator = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed"),
);

export const entrySortValidator = v.union(
  v.literal("top"),
  v.literal("newest"),
);

export const commentSortValidator = v.union(
  v.literal("top"),
  v.literal("newest"),
  v.literal("oldest"),
);

export const actorValidator = v.object({
  id: v.string(),
  isModerator: v.boolean(),
});

export const publicEntryValidator = v.object({
  id: v.string(),
  creationTime: v.number(),
  actorId: v.string(),
  kind: entryKindValidator,
  status: entryStatusValidator,
  title: v.string(),
  body: v.string(),
  upvoteCount: v.number(),
  commentCount: v.number(),
  updatedAt: v.optional(v.number()),
  viewerHasUpvoted: v.boolean(),
});

export const publicCommentValidator = v.object({
  id: v.string(),
  creationTime: v.number(),
  entryId: v.string(),
  parentCommentId: v.optional(v.string()),
  actorId: v.string(),
  depth: v.number(),
  body: v.union(v.string(), v.null()),
  likeCount: v.number(),
  replyCount: v.number(),
  updatedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
  viewerHasLiked: v.boolean(),
});

export const similarEntriesValidator = v.object({
  exact: v.array(publicEntryValidator),
  similar: v.array(publicEntryValidator),
});

/**
 * Category of feedback represented by an entry.
 *
 * - `"feedback"` — general feedback that is not specifically a bug or feature request.
 * - `"feature_request"` — a request for new or changed functionality.
 * - `"bug_report"` — a report describing incorrect or broken behavior.
 */
export type EntryKind = Infer<typeof entryKindValidator>;

/**
 * Workflow state of a feedback entry.
 *
 * Status values are fixed by the component so consumers can rely on a stable,
 * fully typed lifecycle. UI labels and presentation can be customized.
 */
export type EntryStatus = Infer<typeof entryStatusValidator>;

/**
 * Server-side ordering strategy for feedback entries.
 *
 * - `"top"` — entries with the most upvotes first, with creation time used as
 *   the deterministic tie-breaker.
 * - `"newest"` — newest entries first.
 */
export type EntrySort = Infer<typeof entrySortValidator>;

/**
 * Server-side ordering strategy for comments and replies.
 *
 * - `"top"` — comments with the most likes first, with creation time used as
 *   the deterministic tie-breaker.
 * - `"newest"` — newest comments first.
 * - `"oldest"` — oldest comments first.
 */
export type CommentSort = Infer<typeof commentSortValidator>;

/**
 * Authenticated or anonymous actor resolved by the host application.
 *
 * The component does not access the host application's authentication system
 * directly. The host resolves its current user/session into this shape.
 *
 * @property id
 * Stable identifier for the actor. This can be a Clerk ID, Convex Auth ID,
 * application user ID, anonymous installation ID, or another stable
 * host-controlled identifier.
 *
 * @property isModerator
 * Whether the actor can perform moderator-only actions such as changing entry
 * status or modifying content they do not own.
 */
export type FeedbackActor = Infer<typeof actorValidator>;

/**
 * Public representation of a feedback, feature-request, or bug-report entry.
 *
 * @property id
 * Public component document identifier.
 *
 * @property creationTime
 * Convex document creation timestamp in milliseconds since the Unix epoch.
 *
 * @property actorId
 * Stable identifier of the actor who created the entry.
 *
 * @property kind
 * Entry category.
 *
 * @property status
 * Current workflow status.
 *
 * @property title
 * User-provided entry title.
 *
 * @property body
 * User-provided entry description.
 *
 * @property upvoteCount
 * Denormalized number of actors currently upvoting this entry.
 *
 * @property commentCount
 * Denormalized total number of comments belonging to the entry, including
 * nested replies.
 *
 * @property updatedAt
 * Millisecond timestamp of the most recent content update. Absent when the
 * entry has never been edited.
 *
 * @property viewerHasUpvoted
 * Whether the actor associated with the current query has upvoted the entry.
 * `false` when no viewer actor is available.
 */
export type FeedbackEntry = Infer<typeof publicEntryValidator>;

/**
 * Public representation of a comment or reply.
 *
 * Comments are returned one level at a time. Child comments are not included
 * automatically; query them separately using the comment's `id` as
 * `parentCommentId`.
 *
 * @property id
 * Public component document identifier.
 *
 * @property creationTime
 * Convex document creation timestamp in milliseconds since the Unix epoch.
 *
 * @property entryId
 * Entry this comment belongs to.
 *
 * @property parentCommentId
 * Direct parent comment. Absent for top-level comments.
 *
 * @property actorId
 * Stable identifier of the actor who created the comment.
 *
 * @property depth
 * Zero-based nesting depth. Top-level comments have depth `0`.
 *
 * @property body
 * User-provided comment text. `null` when the comment was soft-deleted so
 * nested replies can retain their place in the conversation.
 *
 * @property likeCount
 * Denormalized number of actors currently liking this comment.
 *
 * @property replyCount
 * Number of direct child replies. Descendants below those direct children are
 * not included in this count.
 *
 * @property updatedAt
 * Millisecond timestamp of the latest edit, when the comment has been edited.
 *
 * @property deletedAt
 * Millisecond timestamp at which the comment was soft-deleted.
 *
 * @property viewerHasLiked
 * Whether the actor associated with the current query likes this comment.
 * `false` when no viewer actor is available.
 */
export type FeedbackComment = Infer<typeof publicCommentValidator>;

/**
 * Duplicate-detection result for a proposed entry.
 *
 * Exact normalized-title matches always receive priority. The requested
 * `limit` is a combined limit across both arrays: exact matches consume the
 * available slots first and only the remaining slots can be populated by
 * relevance-ranked full-text matches.
 *
 * For `limit: 3`:
 *
 * - 3 exact matches → `3 exact + 0 similar`
 * - 2 exact matches → `2 exact + at most 1 similar`
 * - 0 exact matches → `0 exact + at most 3 similar`
 *
 * An entry returned in `exact` is never repeated in `similar`.
 *
 * @property exact
 * Entries whose normalized title exactly matches the proposed title.
 *
 * @property similar
 * Full-text matches ordered by search relevance after exact matches have been
 * removed.
 */
export type SimilarEntriesResult = Infer<typeof similarEntriesValidator>;
