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

export const entryStatusFilterValidator = v.union(
  v.literal("open"),
  v.literal("closed"),
);

export const entrySortValidator = v.union(
  v.literal("top"),
  v.literal("newest"),
);

export const entryPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

export const roadmapStatusValidator = v.union(
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("shipped"),
);

export const commentSortValidator = v.union(
  v.literal("top"),
  v.literal("newest"),
  v.literal("oldest"),
);

export const actorValidator = v.object({
  id: v.string(),
  isAdmin: v.optional(v.boolean()),
  /** @deprecated Use `isAdmin`. */
  isModerator: v.optional(v.boolean()),
});

/**
 * Resolves the current admin flag while keeping the pre-`isAdmin` actor shape
 * working for existing hosts. The new field wins when both are present.
 */
export function actorIsAdmin(actor: {
  isAdmin?: boolean;
  isModerator?: boolean;
}): boolean {
  return actor.isAdmin === undefined
    ? actor.isModerator === true
    : actor.isAdmin === true;
}

export const roadmapItemValidator = v.object({
  id: v.string(),
  creationTime: v.number(),
  title: v.string(),
  description: v.optional(v.string()),
  status: roadmapStatusValidator,
  position: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  feedbackCount: v.number(),
});

export const feedbackMetadataValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
);

export const feedbackMetadataRecordValidator = v.record(
  v.string(),
  feedbackMetadataValueValidator,
);

export const feedbackMetadataValidator = v.object({
  standard: v.optional(feedbackMetadataRecordValidator),
  additional: v.optional(feedbackMetadataRecordValidator),
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
  /** Whether the current viewer is the actor who created this entry. */
  viewerIsAuthor: v.optional(v.boolean()),
  metadata: v.optional(feedbackMetadataValidator),
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

export const adminEntryValidator = publicEntryValidator.extend({
  priority: v.optional(entryPriorityValidator),
  roadmap: v.optional(roadmapItemValidator),
  metadata: v.optional(feedbackMetadataValidator),
});

type InferredFeedbackActor = Infer<typeof actorValidator>;
type InferredRoadmapItem = Infer<typeof roadmapItemValidator>;
type InferredFeedbackMetadata = Infer<typeof feedbackMetadataValidator>;
type InferredFeedbackEntry = Infer<typeof publicEntryValidator>;
type InferredAdminFeedbackEntry = Infer<typeof adminEntryValidator>;
type InferredFeedbackComment = Infer<typeof publicCommentValidator>;
type InferredSimilarEntriesResult = Infer<typeof similarEntriesValidator>;

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

/** Coarse status bucket used by the indexed board and search filters. */
export type EntryStatusFilter = Infer<typeof entryStatusFilterValidator>;

export function entryStatusFilterForStatus(
  status: EntryStatus,
): EntryStatusFilter {
  return status === "closed" ? "closed" : "open";
}

/**
 * Server-side ordering strategy for feedback entries.
 *
 * - `"top"` — entries with the most upvotes first, with creation time used as
 *   the deterministic tie-breaker.
 * - `"newest"` — newest entries first.
 */
export type EntrySort = Infer<typeof entrySortValidator>;

/** Internal triage priority visible only through the admin API. */
export type EntryPriority = Infer<typeof entryPriorityValidator>;

/** Workflow stage for an admin roadmap item. */
export type RoadmapStatus = Infer<typeof roadmapStatusValidator>;

/** Admin-managed roadmap item and its current attached-feedback count. */
export interface RoadmapItem {
  /** Public component document identifier. */
  id: InferredRoadmapItem["id"];

  /** Convex document creation timestamp in milliseconds since the Unix epoch. */
  creationTime: InferredRoadmapItem["creationTime"];

  /** Roadmap item title. */
  title: InferredRoadmapItem["title"];

  /** Optional roadmap item description. */
  description?: InferredRoadmapItem["description"];

  /** Current roadmap workflow stage. */
  status: InferredRoadmapItem["status"];

  /** Relative ordering position among roadmap items. */
  position: InferredRoadmapItem["position"];

  /** Millisecond timestamp at which the roadmap item was created. */
  createdAt: InferredRoadmapItem["createdAt"];

  /** Millisecond timestamp of the latest roadmap item update. */
  updatedAt: InferredRoadmapItem["updatedAt"];

  /** Number of feedback entries currently attached to the roadmap item. */
  feedbackCount: InferredRoadmapItem["feedbackCount"];
}

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
 */
export interface FeedbackActor {
  /**
   * Stable identifier for the actor. This can be a Clerk ID, Convex Auth ID,
   * application user ID, anonymous installation ID, or another stable
   * host-controlled identifier.
   */
  id: InferredFeedbackActor["id"];

  /**
   * Whether the actor can perform admin-only actions such as changing entry
   * status or modifying content they do not own. When omitted, the deprecated
   * `isModerator` field is used.
   */
  isAdmin?: InferredFeedbackActor["isAdmin"];

  /** @deprecated Use `isAdmin`. */
  isModerator?: InferredFeedbackActor["isModerator"];
}

/** Scalar value accepted in entry diagnostic metadata. */
export type FeedbackMetadataValue = Infer<
  typeof feedbackMetadataValueValidator
>;

/** Flat metadata values grouped by their source. */
export interface FeedbackMetadata {
  /** Standard diagnostic metadata collected by the component. */
  standard?: InferredFeedbackMetadata["standard"];

  /** Additional host-provided diagnostic metadata. */
  additional?: InferredFeedbackMetadata["additional"];
}

/** Public representation of a feedback, feature-request, or bug-report entry. */
export interface FeedbackEntry {
  /** Public component document identifier. */
  id: InferredFeedbackEntry["id"];

  /** Convex document creation timestamp in milliseconds since the Unix epoch. */
  creationTime: InferredFeedbackEntry["creationTime"];

  /** Stable identifier of the actor who created the entry. */
  actorId: InferredFeedbackEntry["actorId"];

  /** Entry category. */
  kind: InferredFeedbackEntry["kind"];

  /** Current workflow status. */
  status: InferredFeedbackEntry["status"];

  /** User-provided entry title. */
  title: InferredFeedbackEntry["title"];

  /** User-provided entry description. */
  body: InferredFeedbackEntry["body"];

  /** Denormalized number of actors currently upvoting this entry. */
  upvoteCount: InferredFeedbackEntry["upvoteCount"];

  /** Denormalized total number of comments belonging to the entry, including nested replies. */
  commentCount: InferredFeedbackEntry["commentCount"];

  /** Millisecond timestamp of the most recent content update. Absent when the entry has never been edited. */
  updatedAt?: InferredFeedbackEntry["updatedAt"];

  /** Whether the actor associated with the current query has upvoted the entry. `false` when no viewer actor is available. */
  viewerHasUpvoted: InferredFeedbackEntry["viewerHasUpvoted"];

  /**
   * Whether the actor associated with the current query created the entry.
   * `false` when no viewer actor is available. This is optional for compatibility
   * with hosts that have not yet redeployed the updated wrapper.
   */
  viewerIsAuthor?: InferredFeedbackEntry["viewerIsAuthor"];

  /**
   * Creation-time diagnostic metadata. Present only when `getEntry` is queried
   * by an admin. Ordinary entry lists, searches, and non-admin reads omit this
   * property.
   */
  metadata?: InferredFeedbackEntry["metadata"];
}

/** Feedback entry enriched with private triage metadata for admin clients. */
export interface AdminFeedbackEntry {
  /** Public component document identifier. */
  id: InferredAdminFeedbackEntry["id"];

  /** Convex document creation timestamp in milliseconds since the Unix epoch. */
  creationTime: InferredAdminFeedbackEntry["creationTime"];

  /** Stable identifier of the actor who created the entry. */
  actorId: InferredAdminFeedbackEntry["actorId"];

  /** Entry category. */
  kind: InferredAdminFeedbackEntry["kind"];

  /** Current workflow status. */
  status: InferredAdminFeedbackEntry["status"];

  /** User-provided entry title. */
  title: InferredAdminFeedbackEntry["title"];

  /** User-provided entry description. */
  body: InferredAdminFeedbackEntry["body"];

  /** Denormalized number of actors currently upvoting this entry. */
  upvoteCount: InferredAdminFeedbackEntry["upvoteCount"];

  /** Denormalized total number of comments belonging to the entry, including nested replies. */
  commentCount: InferredAdminFeedbackEntry["commentCount"];

  /** Millisecond timestamp of the most recent content update. Absent when the entry has never been edited. */
  updatedAt?: InferredAdminFeedbackEntry["updatedAt"];

  /** Whether the actor associated with the current query has upvoted the entry. `false` when no viewer actor is available. */
  viewerHasUpvoted: InferredAdminFeedbackEntry["viewerHasUpvoted"];

  /** Whether the actor associated with the current query created the entry. */
  viewerIsAuthor?: InferredAdminFeedbackEntry["viewerIsAuthor"];

  /** Creation-time diagnostic metadata returned to admin clients. */
  metadata?: InferredAdminFeedbackEntry["metadata"];

  /** Internal triage priority. */
  priority?: InferredAdminFeedbackEntry["priority"];

  /** Roadmap item attached to the entry, when one exists. */
  roadmap?: InferredAdminFeedbackEntry["roadmap"];
}

/**
 * Public representation of a comment or reply.
 *
 * Comments are returned one level at a time. Child comments are not included
 * automatically; query them separately using the comment's `id` as
 * `parentCommentId`.
 */
export interface FeedbackComment {
  /** Public component document identifier. */
  id: InferredFeedbackComment["id"];

  /** Convex document creation timestamp in milliseconds since the Unix epoch. */
  creationTime: InferredFeedbackComment["creationTime"];

  /** Entry this comment belongs to. */
  entryId: InferredFeedbackComment["entryId"];

  /** Direct parent comment. Absent for top-level comments. */
  parentCommentId?: InferredFeedbackComment["parentCommentId"];

  /** Stable identifier of the actor who created the comment. */
  actorId: InferredFeedbackComment["actorId"];

  /** Zero-based nesting depth. Top-level comments have depth `0`. */
  depth: InferredFeedbackComment["depth"];

  /** User-provided comment text. `null` when the comment was soft-deleted so nested replies can retain their place in the conversation. */
  body: InferredFeedbackComment["body"];

  /** Denormalized number of actors currently liking this comment. */
  likeCount: InferredFeedbackComment["likeCount"];

  /** Number of direct child replies. Descendants below those direct children are not included in this count. */
  replyCount: InferredFeedbackComment["replyCount"];

  /** Millisecond timestamp of the latest edit, when the comment has been edited. */
  updatedAt?: InferredFeedbackComment["updatedAt"];

  /** Millisecond timestamp at which the comment was soft-deleted. */
  deletedAt?: InferredFeedbackComment["deletedAt"];

  /** Whether the actor associated with the current query likes this comment. `false` when no viewer actor is available. */
  viewerHasLiked: InferredFeedbackComment["viewerHasLiked"];
}

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
 */
export interface SimilarEntriesResult {
  /** Entries whose normalized title exactly matches the proposed title. */
  exact: InferredSimilarEntriesResult["exact"];

  /** Full-text matches ordered by search relevance after exact matches have been removed. */
  similar: InferredSimilarEntriesResult["similar"];
}
