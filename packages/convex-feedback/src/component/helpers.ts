import { ConvexError } from "convex/values";

import type { DataModel } from "./_generated/dataModel.js";
import type { QueryCtx } from "./types.js";
import type {
  AdminFeedbackEntry,
  FeedbackActivityComment,
  FeedbackActivityEntryWithContext,
  FeedbackComment,
  FeedbackEntry,
  FeedbackReaction,
  RoadmapItem,
} from "./model.js";

const metadataMaximumKeysPerSection = 32;
const metadataMaximumKeyLength = 64;
const metadataMaximumStringLength = 1_024;
const metadataMaximumEncodedBytes = 16 * 1_024;
const forbiddenMetadataKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export function validateFeedbackMetadata(
  metadata: DataModel["entries"]["document"]["metadata"],
): void {
  if (metadata === undefined) return;

  for (const [sectionName, section] of Object.entries(metadata)) {
    if (section === undefined) continue;
    const entries = Object.entries(section);

    if (entries.length > metadataMaximumKeysPerSection) {
      throw new ConvexError(
        `Metadata section '${sectionName}' must contain ${metadataMaximumKeysPerSection} keys or fewer.`,
      );
    }

    for (const [key, value] of entries) {
      if (key.length === 0) {
        throw new ConvexError(
          `Metadata section '${sectionName}' contains an empty key.`,
        );
      }
      if (key.length > metadataMaximumKeyLength) {
        throw new ConvexError(
          `Metadata key '${key}' in section '${sectionName}' must be ${metadataMaximumKeyLength} characters or fewer.`,
        );
      }
      if (
        key.startsWith("_") ||
        key.startsWith("$") ||
        forbiddenMetadataKeys.has(key)
      ) {
        throw new ConvexError(
          `Metadata key '${key}' in section '${sectionName}' is reserved and cannot be used.`,
        );
      }
      if (
        typeof value === "string" &&
        value.length > metadataMaximumStringLength
      ) {
        throw new ConvexError(
          `Metadata value for '${sectionName}.${key}' must be ${metadataMaximumStringLength} characters or fewer.`,
        );
      }
    }
  }

  const encodedBytes = new TextEncoder().encode(
    JSON.stringify(metadata),
  ).length;
  if (encodedBytes > metadataMaximumEncodedBytes) {
    throw new ConvexError(
      `Metadata must be ${metadataMaximumEncodedBytes} UTF-8 bytes or fewer; received ${encodedBytes} bytes.`,
    );
  }
}

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

/**
 * Find the nearest pending deletion in a comment's ancestor chain. The
 * parent chain is bounded by the comment depth configured by the host, and is
 * walked one document at a time so deletion reads stay indexed and bounded.
 */
export async function findDeletingComment(
  ctx: QueryCtx,
  comment: DataModel["comments"]["document"],
): Promise<DataModel["comments"]["document"] | null> {
  let current: DataModel["comments"]["document"] | null = comment;
  let remaining = Math.max(0, comment.depth) + 1;
  while (current !== null && remaining > 0) {
    if (current.deletingAt !== undefined || current.deletedAt !== undefined) {
      return current;
    }
    if (current.parentCommentId === undefined) return null;
    remaining -= 1;
    current = await ctx.db.get("comments", current.parentCommentId);
  }
  return null;
}

export async function commentIsLive(
  ctx: QueryCtx,
  comment: DataModel["comments"]["document"],
): Promise<boolean> {
  return (await findDeletingComment(ctx, comment)) === null;
}

export async function serializeEntry(
  ctx: QueryCtx,
  entry: DataModel["entries"]["document"],
  viewerActorId: string | undefined,
  includeMetadata = false,
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
    viewerIsAuthor:
      viewerActorId !== undefined && entry.actorId === viewerActorId,
    ...(includeMetadata && entry.metadata !== undefined
      ? { metadata: entry.metadata }
      : {}),
  };
}

export function serializeRoadmapItem(
  item: DataModel["roadmap"]["document"],
  position = item.position,
): RoadmapItem {
  return {
    id: item._id,
    creationTime: item._creationTime,
    title: item.title,
    ...(item.description === undefined
      ? {}
      : { description: item.description }),
    status: item.status,
    position,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    feedbackCount: item.feedbackCount,
  };
}

export async function serializeAdminEntry(
  ctx: QueryCtx,
  entry: DataModel["entries"]["document"],
  viewerActorId: string,
): Promise<AdminFeedbackEntry> {
  const [base, roadmap] = await Promise.all([
    serializeEntry(ctx, entry, viewerActorId, true),
    entry.roadmapId === undefined
      ? null
      : ctx.db.get("roadmap", entry.roadmapId),
  ]);

  return {
    ...base,
    ...(entry.priority === undefined ? {} : { priority: entry.priority }),
    ...(roadmap === null ? {} : { roadmap: serializeRoadmapItem(roadmap) }),
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
    body: comment.body,
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    ...(comment.updatedAt === undefined
      ? {}
      : { updatedAt: comment.updatedAt }),
    viewerHasLiked: reaction !== null,
  };
}

/**
 * Serialize an actor-scoped entry. Private diagnostic and triage context is
 * available only to trusted component consumers that explicitly request it.
 */
export async function serializeActivityEntry(
  ctx: QueryCtx,
  entry: DataModel["entries"]["document"],
  includeContext: boolean,
): Promise<FeedbackActivityEntryWithContext> {
  const roadmap =
    includeContext && entry.roadmapId !== undefined
      ? await ctx.db.get("roadmap", entry.roadmapId)
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
    ...(includeContext && entry.metadata === undefined
      ? {}
      : includeContext
        ? { metadata: entry.metadata }
        : {}),
    ...(includeContext && entry.priority === undefined
      ? {}
      : includeContext
        ? { priority: entry.priority }
        : {}),
    ...(roadmap === null || !includeContext
      ? {}
      : { roadmap: serializeRoadmapItem(roadmap) }),
  };
}

/** Remove component-only diagnostic and triage context before host exposure. */
export function stripActivityEntryContext(
  entry: FeedbackActivityEntryWithContext,
): Omit<FeedbackActivityEntryWithContext, "metadata" | "priority" | "roadmap"> {
  return {
    id: entry.id,
    creationTime: entry.creationTime,
    actorId: entry.actorId,
    kind: entry.kind,
    status: entry.status,
    title: entry.title,
    body: entry.body,
    upvoteCount: entry.upvoteCount,
    commentCount: entry.commentCount,
    ...(entry.updatedAt === undefined ? {} : { updatedAt: entry.updatedAt }),
  };
}

/** Serialize an actor-scoped comment using its already-loaded entry. */
export function serializeActivityComment(
  comment: DataModel["comments"]["document"],
  entry: DataModel["entries"]["document"],
): FeedbackActivityComment {
  return {
    id: comment._id,
    creationTime: comment._creationTime,
    entryId: comment.entryId,
    entryTitle: entry.title,
    ...(comment.parentCommentId === undefined
      ? {}
      : { parentCommentId: comment.parentCommentId }),
    actorId: comment.actorId,
    depth: comment.depth,
    body: comment.body,
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    ...(comment.updatedAt === undefined
      ? {}
      : { updatedAt: comment.updatedAt }),
  };
}

/**
 * A reaction target loaded by the activity stream before serialization.
 * Loading the target in the stream mapper and passing it here prevents a
 * second read of the same entry or comment.
 */
export type ActivityReactionTarget =
  | { type: "entry"; entry: DataModel["entries"]["document"] }
  | {
      type: "comment";
      comment: DataModel["comments"]["document"];
      entry: DataModel["entries"]["document"];
    };

/** Serialize a reaction using its already-loaded target context. */
export function serializeActivityReaction(
  reaction: DataModel["reactions"]["document"],
  target: ActivityReactionTarget,
): FeedbackReaction {
  if (target.type === "entry") {
    const { entry } = target;
    return {
      type: "entry_upvote",
      id: reaction._id,
      creationTime: reaction._creationTime,
      entry: {
        id: entry._id,
        title: entry.title,
        kind: entry.kind,
        status: entry.status,
      },
    };
  }

  const { comment, entry } = target;
  return {
    type: "comment_like",
    id: reaction._id,
    creationTime: reaction._creationTime,
    comment: {
      id: comment._id,
      body: comment.body,
      entryId: comment.entryId,
      entryTitle: entry.title,
    },
  };
}
