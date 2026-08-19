import { ConvexError } from "convex/values";

import type { DataModel } from "./_generated/dataModel.js";
import type { QueryCtx } from "./types.js";
import type { FeedbackComment, FeedbackEntry } from "./model.js";

export function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function normalizeRequiredText(
  value: string,
  field: string,
  maximumLength: number,
): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ConvexError(`${field} is required.`);
  }
  if (normalized.length > maximumLength) {
    throw new ConvexError(
      `${field} must be ${maximumLength} characters or fewer.`,
    );
  }
  return normalized;
}

export function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConvexError(`${field} must be a positive integer.`);
  }
}

export function assertActorId(actorId: string): void {
  if (actorId.trim().length === 0) {
    throw new ConvexError("Actor id must not be empty.");
  }
}

export async function serializeEntry(
  ctx: QueryCtx,
  entry: DataModel["entries"]["document"],
  viewerActorId: string | undefined,
): Promise<FeedbackEntry> {
  const reaction =
    viewerActorId !== undefined
      ? await ctx.db
          .query("reactions")
          .withIndex("by_entry_actor", (q) =>
            q.eq("entryId", entry._id).eq("actorId", viewerActorId),
          )
          .unique()
      : null;

  return {
    id: entry._id,
    creationTime: entry._creationTime,
    actorId: entry.actorId,
    kind: entry.kind,
    status: entry.status,
    title: entry.title,
    body: entry.body,
    upvoteCount: entry.upvoteCount,
    commentCount: entry.commentCount,
    ...(entry.updatedAt === undefined ? {} : { updatedAt: entry.updatedAt }),
    viewerHasUpvoted: reaction !== null,
  };
}

export async function serializeComment(
  ctx: QueryCtx,
  comment: DataModel["comments"]["document"],
  viewerActorId: string | undefined,
): Promise<FeedbackComment> {
  const reaction =
    viewerActorId !== undefined
      ? await ctx.db
          .query("reactions")
          .withIndex("by_comment_actor", (q) =>
            q.eq("commentId", comment._id).eq("actorId", viewerActorId),
          )
          .unique()
      : null;

  return {
    id: comment._id,
    creationTime: comment._creationTime,
    entryId: comment.entryId,
    ...(comment.parentCommentId === undefined
      ? {}
      : { parentCommentId: comment.parentCommentId }),
    actorId: comment.actorId,
    depth: comment.depth,
    body: comment.deletedAt === undefined ? comment.body : null,
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    ...(comment.updatedAt === undefined
      ? {}
      : { updatedAt: comment.updatedAt }),
    ...(comment.deletedAt === undefined
      ? {}
      : { deletedAt: comment.deletedAt }),
    viewerHasLiked: reaction !== null,
  };
}
