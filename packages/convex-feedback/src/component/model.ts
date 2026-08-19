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

export type EntryKind = Infer<typeof entryKindValidator>;
export type EntryStatus = Infer<typeof entryStatusValidator>;
export type EntrySort = Infer<typeof entrySortValidator>;
export type CommentSort = Infer<typeof commentSortValidator>;
export type FeedbackActor = Infer<typeof actorValidator>;
export type FeedbackEntry = Infer<typeof publicEntryValidator>;
export type FeedbackComment = Infer<typeof publicCommentValidator>;
export type SimilarEntriesResult = Infer<typeof similarEntriesValidator>;
