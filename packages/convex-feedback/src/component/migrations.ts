import { v } from "convex/values";

import { internal } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { startCommentDeletion } from "./comments.js";
import { entryStatusFilterForStatus } from "./model.js";
import type { MutationCtx } from "./types.js";

const statusFilterMigrationBatchSize = 100;
const legacyCommentMigrationBatchSize = 25;
const legacyReactionMigrationBatchSize = 100;

type LegacyCommentMigrationPhase = "tombstones" | "comments" | "reactions";

async function scheduleLegacyCommentMigration(
  ctx: MutationCtx,
  phase: LegacyCommentMigrationPhase,
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.migrations.cleanupLegacyComments, {
    phase,
  });
}

type CommentInspection =
  | { kind: "valid" }
  | { kind: "orphan" }
  | { kind: "pending"; root: Doc<"comments"> };

/**
 * Validate a comment's parent chain without loading the same document twice.
 * A missing parent or an entry mismatch makes the whole subtree legacy
 * orphan data; a pending ancestor points the migration at the existing
 * bounded subtree cleaner.
 */
async function inspectCommentChain(
  ctx: MutationCtx,
  comment: Doc<"comments">,
  cache: Map<string, Doc<"comments"> | null>,
): Promise<CommentInspection> {
  let current = comment;
  let remaining = Math.max(0, comment.depth) + 1;
  while (remaining > 0) {
    if (current.deletingAt !== undefined) {
      return { kind: "pending", root: current };
    }
    if (current.deletedAt !== undefined) {
      return { kind: "pending", root: current };
    }
    if (current.parentCommentId === undefined) {
      return { kind: "valid" };
    }

    remaining -= 1;
    const parentId = current.parentCommentId;
    let parent = cache.get(parentId);
    if (parent === undefined) {
      parent = await ctx.db.get("comments", parentId);
      cache.set(parentId, parent);
    }
    if (parent === null || parent.entryId !== comment.entryId) {
      return { kind: "orphan" };
    }
    current = parent;
  }

  // A malformed cycle or an invalid depth is safer to remove than to leave
  // permanently unreachable feedback data behind.
  return { kind: "orphan" };
}

async function scheduleEntryCleanupOnce(
  ctx: MutationCtx,
  entryId: Doc<"entries">["_id"],
  scheduled: Set<string>,
): Promise<void> {
  const key = String(entryId);
  if (scheduled.has(key)) return;
  scheduled.add(key);
  await ctx.scheduler.runAfter(0, internal.entries.removeBatch, { entryId });
}

async function deleteLegacyReaction(
  ctx: MutationCtx,
  reaction: Doc<"reactions">,
  comment: Doc<"comments"> | null,
  entry: Doc<"entries"> | null,
): Promise<void> {
  await ctx.db.delete("reactions", reaction._id);

  // Keep a surviving comment's denormalized count accurate when a malformed
  // legacy reaction points at a missing entry but still names a live comment.
  if (
    comment !== null &&
    entry !== null &&
    comment.deletingAt === undefined &&
    comment.deletedAt === undefined
  ) {
    await ctx.db.patch("comments", comment._id, {
      likeCount: Math.max(0, comment.likeCount - 1),
    });
  }
}

/**
 * Backfills one bounded batch of legacy entries and schedules the next batch.
 *
 * The indexed undefined lookup and deterministic status mapping make this
 * safe to run concurrently, retry, or invoke again after completion.
 */
export const backfillStatusFilter = internalMutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_status_filter", (q) => q.eq("statusFilter", undefined))
      .take(statusFilterMigrationBatchSize);

    for (const entry of entries) {
      await ctx.db.patch("entries", entry._id, {
        statusFilter: entryStatusFilterForStatus(entry.status),
      });
    }

    const hasMore = entries.length === statusFilterMigrationBatchSize;
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillStatusFilter,
        {},
      );
    }

    return { updated: entries.length, hasMore };
  },
});

/**
 * Drain comments written by versions that used soft deletion. The migration
 * is deliberately split into three bounded passes:
 *
 * 1. indexed legacy tombstones are marked for the current subtree cleaner;
 * 2. an indexed comment sweep marks broken parent/entry references;
 * 3. an indexed reaction sweep removes any remaining orphan reactions.
 *
 * Each pass schedules its continuation after committing the current batch.
 * Re-running any phase is safe because migration markers and document deletes
 * are idempotent, while the normal comment cleaner remains the single place
 * that updates counters and removes descendants.
 */
export const cleanupLegacyComments = internalMutation({
  args: {
    phase: v.optional(
      v.union(
        v.literal("tombstones"),
        v.literal("comments"),
        v.literal("reactions"),
      ),
    ),
  },
  returns: v.object({
    phase: v.union(
      v.literal("tombstones"),
      v.literal("comments"),
      v.literal("reactions"),
    ),
    processed: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const phase = args.phase ?? "tombstones";

    if (phase === "tombstones") {
      const tombstones = await ctx.db
        .query("comments")
        .withIndex("by_deleted_at", (q) => q.gte("deletedAt", 0))
        .take(legacyCommentMigrationBatchSize);

      const scheduledRoots = new Set<string>();
      for (const comment of tombstones) {
        const rootId = comment.deletionRootId ?? comment._id;
        const root =
          rootId === comment._id
            ? comment
            : await ctx.db.get("comments", rootId);
        const deletionRoot = root ?? comment;
        const key = String(deletionRoot._id);
        if (scheduledRoots.has(key)) continue;
        scheduledRoots.add(key);
        await startCommentDeletion(
          ctx,
          deletionRoot,
          deletionRoot.deletedAt ?? deletionRoot.deletingAt ?? Date.now(),
        );
      }

      if (tombstones.length > 0) {
        // Tombstone documents remain indexed until their scheduled cleaner
        // finishes. Retry the same indexed pass so a short migration run also
        // waits for those cleaners before moving to orphan discovery.
        await scheduleLegacyCommentMigration(ctx, "tombstones");
        return {
          phase: "tombstones" as const,
          processed: tombstones.length,
          hasMore: true,
        };
      }

      const pendingComments = await ctx.db
        .query("comments")
        .withIndex("by_legacy_cleanup", (q) =>
          q.eq("legacyCleanupAt", undefined),
        )
        .take(1);
      if (pendingComments.length > 0) {
        await scheduleLegacyCommentMigration(ctx, "comments");
        return { phase: "comments" as const, processed: 0, hasMore: true };
      }

      const pendingReactions = await ctx.db
        .query("reactions")
        .withIndex("by_legacy_cleanup", (q) =>
          q.eq("legacyCleanupAt", undefined),
        )
        .take(1);
      if (pendingReactions.length > 0) {
        await scheduleLegacyCommentMigration(ctx, "reactions");
        return { phase: "reactions" as const, processed: 0, hasMore: true };
      }

      return { phase: "reactions" as const, processed: 0, hasMore: false };
    }

    if (phase === "comments") {
      const page = await ctx.db
        .query("comments")
        .withIndex("by_legacy_cleanup", (q) =>
          q.eq("legacyCleanupAt", undefined),
        )
        .take(legacyCommentMigrationBatchSize);

      const commentCache = new Map<string, Doc<"comments"> | null>();
      for (const comment of page) {
        commentCache.set(String(comment._id), comment);
      }
      const entryCache = new Map<string, Doc<"entries"> | null>();
      const scheduledRoots = new Set<string>();
      const scheduledEntries = new Set<string>();

      const markRoot = async (
        comment: Doc<"comments">,
        deletionToken?: number,
      ): Promise<void> => {
        const rootId = comment.deletionRootId ?? comment._id;
        const root =
          rootId === comment._id
            ? comment
            : await ctx.db.get("comments", rootId);
        const deletionRoot = root ?? comment;
        const key = String(deletionRoot._id);
        if (scheduledRoots.has(key)) return;
        scheduledRoots.add(key);
        await startCommentDeletion(
          ctx,
          deletionRoot,
          deletionToken ??
            deletionRoot.deletedAt ??
            deletionRoot.deletingAt ??
            Date.now(),
        );
      };

      const getEntry = async (
        entryId: Doc<"entries">["_id"],
      ): Promise<Doc<"entries"> | null> => {
        const key = String(entryId);
        const cached = entryCache.get(key);
        if (cached !== undefined) return cached;
        const entry = await ctx.db.get("entries", entryId);
        entryCache.set(key, entry);
        return entry;
      };

      for (const comment of page) {
        if (
          comment.deletedAt !== undefined ||
          comment.deletingAt !== undefined
        ) {
          await markRoot(comment, comment.deletedAt ?? comment.deletingAt);
          continue;
        }

        const entry = await getEntry(comment.entryId);
        if (entry === null) {
          await markRoot(comment);
          continue;
        }
        if (entry.deletingAt !== undefined) {
          await scheduleEntryCleanupOnce(ctx, entry._id, scheduledEntries);
          continue;
        }

        const inspection = await inspectCommentChain(
          ctx,
          comment,
          commentCache,
        );
        if (inspection.kind === "orphan") {
          await markRoot(comment);
        } else if (inspection.kind === "pending") {
          await markRoot(inspection.root);
        } else {
          await ctx.db.patch("comments", comment._id, {
            legacyCleanupAt: Date.now(),
          });
        }
      }

      if (page.length === 0) {
        await scheduleLegacyCommentMigration(ctx, "reactions");
      } else {
        await scheduleLegacyCommentMigration(ctx, "comments");
      }

      const nextPhase: "comments" | "reactions" =
        page.length === 0 ? "reactions" : "comments";
      return {
        phase: nextPhase,
        processed: page.length,
        hasMore: true,
      };
    }

    const page = await ctx.db
      .query("reactions")
      .withIndex("by_legacy_cleanup", (q) => q.eq("legacyCleanupAt", undefined))
      .take(legacyReactionMigrationBatchSize);
    const commentCache = new Map<string, Doc<"comments"> | null>();
    const entryCache = new Map<string, Doc<"entries"> | null>();
    const scheduledRoots = new Set<string>();
    const scheduledEntries = new Set<string>();

    const getComment = async (
      commentId: Doc<"comments">["_id"],
    ): Promise<Doc<"comments"> | null> => {
      const key = String(commentId);
      const cached = commentCache.get(key);
      if (cached !== undefined) return cached;
      const comment = await ctx.db.get("comments", commentId);
      commentCache.set(key, comment);
      return comment;
    };
    const getEntry = async (
      entryId: Doc<"entries">["_id"],
    ): Promise<Doc<"entries"> | null> => {
      const key = String(entryId);
      const cached = entryCache.get(key);
      if (cached !== undefined) return cached;
      const entry = await ctx.db.get("entries", entryId);
      entryCache.set(key, entry);
      return entry;
    };
    const markRoot = async (comment: Doc<"comments">): Promise<void> => {
      const rootId = comment.deletionRootId ?? comment._id;
      const root =
        rootId === comment._id ? comment : await ctx.db.get("comments", rootId);
      const deletionRoot = root ?? comment;
      const key = String(deletionRoot._id);
      if (scheduledRoots.has(key)) return;
      scheduledRoots.add(key);
      await startCommentDeletion(
        ctx,
        deletionRoot,
        deletionRoot.deletedAt ?? deletionRoot.deletingAt ?? Date.now(),
      );
    };

    for (const reaction of page) {
      let comment: Doc<"comments"> | null = null;
      let owningEntry: Doc<"entries"> | null = null;
      let removeReaction = false;

      if (reaction.commentId !== undefined) {
        comment = await getComment(reaction.commentId);
        if (comment === null) {
          removeReaction = true;
        } else {
          owningEntry = await getEntry(comment.entryId);
          if (owningEntry === null) {
            removeReaction = true;
            await markRoot(comment);
          } else if (owningEntry.deletingAt !== undefined) {
            removeReaction = true;
            await scheduleEntryCleanupOnce(
              ctx,
              owningEntry._id,
              scheduledEntries,
            );
          } else {
            const inspection = await inspectCommentChain(
              ctx,
              comment,
              commentCache,
            );
            if (inspection.kind === "orphan") {
              removeReaction = true;
              await markRoot(comment);
            } else if (inspection.kind === "pending") {
              removeReaction = true;
              await markRoot(inspection.root);
            }
          }
        }

        if (reaction.entryId !== undefined) {
          const reactionEntry = await getEntry(reaction.entryId);
          if (
            reactionEntry === null ||
            (owningEntry !== null && reactionEntry._id !== owningEntry._id)
          ) {
            removeReaction = true;
          }
        }
      } else if (reaction.entryId !== undefined) {
        const entry = await getEntry(reaction.entryId);
        if (entry === null) {
          removeReaction = true;
        } else if (entry.deletingAt !== undefined) {
          removeReaction = true;
          await scheduleEntryCleanupOnce(ctx, entry._id, scheduledEntries);
        }
      } else {
        removeReaction = true;
      }

      if (removeReaction) {
        await deleteLegacyReaction(ctx, reaction, comment, owningEntry);
      } else {
        await ctx.db.patch("reactions", reaction._id, {
          legacyCleanupAt: Date.now(),
        });
      }
    }

    if (page.length > 0) {
      await scheduleLegacyCommentMigration(ctx, "reactions");
    }

    return {
      phase: "reactions" as const,
      processed: page.length,
      hasMore: page.length > 0,
    };
  },
});
