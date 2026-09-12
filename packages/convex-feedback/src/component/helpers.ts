import { ConvexError } from "convex/values";

import type { DataModel } from "./_generated/dataModel.js";
import type { QueryCtx } from "./types.js";
import type {
  AdminFeedbackEntry,
  FeedbackComment,
  FeedbackEntry,
  FeedbackTag,
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
    ...(includeMetadata && entry.metadata !== undefined
      ? { metadata: entry.metadata }
      : {}),
  };
}

export function serializeTag(tag: DataModel["tags"]["document"]): FeedbackTag {
  return {
    id: tag._id,
    creationTime: tag._creationTime,
    name: tag.name,
    ...(tag.color === undefined ? {} : { color: tag.color }),
    updatedAt: tag.updatedAt,
  };
}

export function serializeRoadmapItem(
  item: DataModel["roadmap"]["document"],
): RoadmapItem {
  return {
    id: item._id,
    creationTime: item._creationTime,
    title: item.title,
    ...(item.description === undefined
      ? {}
      : { description: item.description }),
    status: item.status,
    position: item.position,
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
  const [base, primaryTag, secondaryTag, roadmap] = await Promise.all([
    serializeEntry(ctx, entry, viewerActorId, true),
    entry.primaryTagId === undefined
      ? null
      : ctx.db.get("tags", entry.primaryTagId),
    entry.secondaryTagId === undefined
      ? null
      : ctx.db.get("tags", entry.secondaryTagId),
    entry.roadmapId === undefined
      ? null
      : ctx.db.get("roadmap", entry.roadmapId),
  ]);

  return {
    ...base,
    ...(entry.priority === undefined ? {} : { priority: entry.priority }),
    ...(primaryTag === null ? {} : { primaryTag: serializeTag(primaryTag) }),
    ...(secondaryTag === null
      ? {}
      : { secondaryTag: serializeTag(secondaryTag) }),
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
