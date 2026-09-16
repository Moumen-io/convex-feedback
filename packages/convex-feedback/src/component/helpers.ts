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

/** Serialize an actor-scoped comment without loading its parent comment. */
export async function serializeActivityComment(
  ctx: QueryCtx,
  comment: DataModel["comments"]["document"],
): Promise<FeedbackActivityComment> {
  const entry = await ctx.db.get("entries", comment.entryId);

  return {
    id: comment._id,
    creationTime: comment._creationTime,
    entryId: comment.entryId,
    entryTitle: entry?.title ?? null,
    ...(comment.parentCommentId === undefined
      ? {}
      : { parentCommentId: comment.parentCommentId }),
    actorId: comment.actorId,
    depth: comment.depth,
    body: comment.body ?? null,
    likeCount: comment.likeCount,
    replyCount: comment.replyCount,
    ...(comment.updatedAt === undefined
      ? {}
      : { updatedAt: comment.updatedAt }),
    ...(comment.deletedAt === undefined
      ? {}
      : { deletedAt: comment.deletedAt }),
  };
}

/**
 * Serialize a reaction and resolve only the target context needed by an
 * activity consumer. Target authors are intentionally not included.
 */
export async function serializeActivityReaction(
  ctx: QueryCtx,
  reaction: DataModel["reactions"]["document"],
): Promise<FeedbackReaction> {
  if (reaction.entryId !== undefined) {
    const entry = await ctx.db.get("entries", reaction.entryId);

    return {
      type: "entry_upvote",
      id: reaction._id,
      creationTime: reaction._creationTime,
      entry:
        entry === null
          ? null
          : {
              id: entry._id,
              title: entry.title,
              kind: entry.kind,
              status: entry.status,
            },
    };
  }

  if (reaction.commentId !== undefined) {
    const comment = await ctx.db.get("comments", reaction.commentId);

    if (comment === null) {
      return {
        type: "comment_like",
        id: reaction._id,
        creationTime: reaction._creationTime,
        comment: null,
      };
    }

    const entry = await ctx.db.get("entries", comment.entryId);
    return {
      type: "comment_like",
      id: reaction._id,
      creationTime: reaction._creationTime,
      comment: {
        id: comment._id,
        body: comment.deletedAt === undefined ? comment.body : null,
        entryId: comment.entryId,
        entryTitle: entry?.title ?? null,
      },
    };
  }

  // Mutations always write exactly one target, but represent malformed legacy
  // records as an orphaned entry reaction instead of failing the page.
  return {
    type: "entry_upvote",
    id: reaction._id,
    creationTime: reaction._creationTime,
    entry: null,
  };
}
