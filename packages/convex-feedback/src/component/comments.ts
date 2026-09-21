import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { stream } from "convex-helpers/server/stream";

import type { Doc } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";
import { internalMutation, mutation, query } from "./_generated/server.js";
import {
  assertActorId,
  assertPositiveInteger,
  commentIsLive,
  findDeletingComment,
  normalizeRequiredText,
  serializeActivityComment,
  serializeComment,
} from "./helpers.js";
import {
  activityCommentValidator,
  actorValidator,
  actorIsAdmin,
  commentSortValidator,
  entryKindValidator,
  entryStatusValidator,
  entryStatusFilterForStatus,
  publicCommentValidator,
} from "./model.js";
import schema from "./schema.js";
import type { MutationCtx } from "./types.js";

const commentDeletionBatchSize = 25;
const reactionDeletionBatchSize = 100;

async function scheduleCommentCleanup(
  ctx: MutationCtx,
  commentId: Doc<"comments">["_id"],
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.comments.removeBatch, { commentId });
}

/**
 * Mark a comment subtree for permanent deletion and enqueue its bounded
 * cleanup. The helper is shared by the public delete mutation and the legacy
 * migration so both paths use the same deletion token and retry semantics.
 */
export async function startCommentDeletion(
  ctx: MutationCtx,
  comment: Doc<"comments">,
  deletionToken = Date.now(),
): Promise<void> {
  let rootId =
    comment.deletingAt === undefined
      ? comment._id
      : (comment.deletionRootId ?? comment._id);

  // A legacy or interrupted cleanup can leave a pending child pointing at a
  // root that was already removed. Re-root that child so retries cannot keep
  // scheduling a missing document forever.
  if (
    comment.deletingAt !== undefined &&
    comment.deletionRootId !== undefined
  ) {
    const root = await ctx.db.get("comments", comment.deletionRootId);
    if (root === null || root.deletingAt === undefined) {
      rootId = comment._id;
      await ctx.db.patch("comments", comment._id, {
        deletionRootId: rootId,
      });
    }
  }
  if (comment.deletingAt === undefined) {
    await ctx.db.patch("comments", comment._id, {
      deletingAt: deletionToken,
      deletionRootId: rootId,
    });
  }
  await scheduleCommentCleanup(ctx, rootId);
}

function emptyCommentPaginationResult() {
  return { page: [], isDone: true, continueCursor: "" };
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    entryId: v.id("entries"),
    parentCommentId: v.optional(v.id("comments")),
    sort: commentSortValidator,
    viewerActorId: v.optional(v.string()),
  },
  returns: paginationResultValidator(publicCommentValidator),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null || entry.deletingAt !== undefined) {
      return {
        ...emptyCommentPaginationResult(),
      };
    }

    if (args.parentCommentId !== undefined) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent === null || parent.entryId !== args.entryId) {
        throw new ConvexError("Parent comment not found on this entry.");
      }
      if (!(await commentIsLive(ctx, parent))) {
        return {
          ...emptyCommentPaginationResult(),
        };
      }
    }

    const db = paginator(ctx.db, schema);
    const result =
      args.sort === "top"
        ? await db
            .query("comments")
            .withIndex("by_entry_parent_deleting_likes", (q) =>
              q
                .eq("entryId", args.entryId)
                .eq("parentCommentId", args.parentCommentId)
                .eq("deletingAt", undefined)
                .eq("deletedAt", undefined),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await db
            .query("comments")
            .withIndex("by_entry_parent_deleting", (q) =>
              q
                .eq("entryId", args.entryId)
                .eq("parentCommentId", args.parentCommentId)
                .eq("deletingAt", undefined)
                .eq("deletedAt", undefined),
            )
            .order(args.sort === "newest" ? "desc" : "asc")
            .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((comment) =>
          serializeComment(ctx, comment, args.viewerActorId),
        ),
      ),
    };
  },
});

/**
 * List comments created by a known actor. The actor is supplied by trusted
 * component/server callers; the host-facing wrapper resolves it from the
 * current request instead of accepting it from clients.
 *
 * This activity query resolves the current parent entry title and excludes
 * comments whose entry or ancestor is pending deletion.
 */
export const listByActor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorId: v.string(),
  },
  returns: paginationResultValidator(activityCommentValidator),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);

    const result = await stream(ctx.db, schema)
      .query("comments")
      .withIndex("by_actor", (q) => q.eq("actorId", args.actorId))
      .order("desc")
      .map(async (comment) => {
        if (
          comment.deletingAt !== undefined ||
          comment.deletedAt !== undefined
        ) {
          return null;
        }
        const entry = await ctx.db.get("entries", comment.entryId);
        if (
          entry === null ||
          entry.deletingAt !== undefined ||
          !(await commentIsLive(ctx, comment))
        ) {
          return null;
        }
        return serializeActivityComment(comment, entry);
      })
      .paginate(args.paginationOpts);

    return result;
  },
});

export const create = mutation({
  args: {
    actorId: v.string(),
    entryId: v.id("entries"),
    parentCommentId: v.optional(v.id("comments")),
    body: v.string(),
    maxDepth: v.number(),
    maxCommentLength: v.number(),
    includeCallbackContext: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({ id: v.id("comments") }),
    v.object({
      id: v.id("comments"),
      comment: v.object({
        id: v.id("comments"),
        actorId: v.string(),
        entryId: v.id("entries"),
        parentCommentId: v.optional(v.id("comments")),
        body: v.string(),
        depth: v.number(),
      }),
      entry: v.object({
        id: v.id("entries"),
        actorId: v.string(),
        kind: entryKindValidator,
        status: entryStatusValidator,
        title: v.string(),
      }),
      parentComment: v.optional(
        v.object({ id: v.id("comments"), actorId: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    assertPositiveInteger(args.maxDepth, "Maximum comment depth");
    assertPositiveInteger(args.maxCommentLength, "Maximum comment length");

    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }

    const body = normalizeRequiredText(
      args.body,
      "Comment",
      args.maxCommentLength,
    );

    let depth = 0;
    let parent: Doc<"comments"> | null = null;
    if (args.parentCommentId !== undefined) {
      parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent === null || parent.entryId !== args.entryId) {
        throw new ConvexError("Parent comment not found on this entry.");
      }
      if (!(await commentIsLive(ctx, parent))) {
        throw new ConvexError("Comment is being deleted.");
      }
      depth = parent.depth + 1;
      if (depth > args.maxDepth) {
        throw new ConvexError(
          `Comments may not exceed depth ${args.maxDepth}.`,
        );
      }
    }

    const commentId = await ctx.db.insert("comments", {
      entryId: args.entryId,
      ...(args.parentCommentId === undefined
        ? {}
        : { parentCommentId: args.parentCommentId }),
      actorId: args.actorId,
      depth,
      body,
      likeCount: 0,
      replyCount: 0,
    });

    await ctx.db.patch("entries", args.entryId, {
      commentCount: entry.commentCount + 1,
      statusFilter: entryStatusFilterForStatus(entry.status),
    });

    if (parent !== null) {
      await ctx.db.patch("comments", parent._id, {
        replyCount: parent.replyCount + 1,
      });
    }

    if (!args.includeCallbackContext) return { id: commentId };

    return {
      id: commentId,
      comment: {
        id: commentId,
        actorId: args.actorId,
        entryId: args.entryId,
        ...(args.parentCommentId === undefined
          ? {}
          : { parentCommentId: args.parentCommentId }),
        body,
        depth,
      },
      entry: {
        id: entry._id,
        actorId: entry.actorId,
        kind: entry.kind,
        status: entry.status,
        title: entry.title,
      },
      ...(parent === null
        ? {}
        : {
            parentComment: { id: parent._id, actorId: parent.actorId },
          }),
    };
  },
});

export const update = mutation({
  args: {
    actor: actorValidator,
    commentId: v.id("comments"),
    body: v.string(),
    editableByAuthor: v.boolean(),
    maxCommentLength: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertActorId(args.actor.id);
    const comment = await ctx.db.get("comments", args.commentId);
    if (comment === null) throw new ConvexError("Comment not found.");
    if (!(await commentIsLive(ctx, comment))) {
      throw new ConvexError("Comment is being deleted.");
    }
    const entry = await ctx.db.get("entries", comment.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }

    const canEdit =
      actorIsAdmin(args.actor) ||
      (args.editableByAuthor && comment.actorId === args.actor.id);
    if (!canEdit) throw new ConvexError("Not authorized to edit this comment.");

    const body = normalizeRequiredText(
      args.body,
      "Comment",
      args.maxCommentLength,
    );
    await ctx.db.patch("comments", args.commentId, {
      body,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: {
    actor: actorValidator,
    commentId: v.id("comments"),
    deletableByAuthor: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertActorId(args.actor.id);
    const comment = await ctx.db.get("comments", args.commentId);
    if (comment === null) return null;

    const pending = await findDeletingComment(ctx, comment);
    if (pending !== null) {
      await scheduleCommentCleanup(ctx, pending._id);
      return null;
    }

    const canDelete =
      actorIsAdmin(args.actor) ||
      (args.deletableByAuthor && comment.actorId === args.actor.id);
    if (!canDelete) {
      throw new ConvexError("Not authorized to delete this comment.");
    }

    await startCommentDeletion(ctx, comment);
    return null;
  },
});

/**
 * Remove one bounded slice of a pending comment subtree. Children are marked
 * with the root's deletion token before leaves are removed, which keeps the
 * whole subtree hidden immediately and lets retries resume from indexed
 * state. Reactions are drained before each comment is deleted.
 */
export const removeBatch = internalMutation({
  args: { commentId: v.id("comments") },
  returns: v.object({ processed: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const root = await ctx.db.get("comments", args.commentId);
    if (root === null || root.deletingAt === undefined) {
      return { processed: 0, hasMore: false };
    }

    const deletionToken = root.deletingAt;
    const deletionRootId = root.deletionRootId ?? root._id;
    if (root.deletionRootId === undefined) {
      await ctx.db.patch("comments", root._id, { deletionRootId });
    }
    const entry = await ctx.db.get("entries", root.entryId);
    const pendingComments = await ctx.db
      .query("comments")
      .withIndex("by_entry_deletion_root", (q) =>
        q.eq("entryId", root.entryId).eq("deletionRootId", deletionRootId),
      )
      .take(commentDeletionBatchSize + 1);

    let processed = 0;
    let deletedComments = 0;

    for (const comment of pendingComments.slice(0, commentDeletionBatchSize)) {
      const unmarkedChildren = await ctx.db
        .query("comments")
        .withIndex("by_entry_parent_deleting", (q) =>
          q
            .eq("entryId", root.entryId)
            .eq("parentCommentId", comment._id)
            .eq("deletingAt", undefined),
        )
        .take(commentDeletionBatchSize + 1);

      if (unmarkedChildren.length > 0) {
        for (const child of unmarkedChildren.slice(
          0,
          commentDeletionBatchSize,
        )) {
          await ctx.db.patch("comments", child._id, {
            deletingAt: deletionToken,
            deletionRootId,
          });
          processed += 1;
        }
        continue;
      }

      const remainingChild = await ctx.db
        .query("comments")
        .withIndex("by_entry_parent", (q) =>
          q.eq("entryId", root.entryId).eq("parentCommentId", comment._id),
        )
        .first();
      if (remainingChild !== null) continue;

      const commentReactions = await ctx.db
        .query("reactions")
        .withIndex("by_comment_actor", (q) => q.eq("commentId", comment._id))
        .take(reactionDeletionBatchSize + 1);
      for (const reaction of commentReactions.slice(
        0,
        reactionDeletionBatchSize,
      )) {
        await ctx.db.delete("reactions", reaction._id);
        processed += 1;
      }
      if (commentReactions.length > reactionDeletionBatchSize) {
        await scheduleCommentCleanup(ctx, root._id);
        return { processed, hasMore: true };
      }

      await ctx.db.delete("comments", comment._id);
      processed += 1;
      deletedComments += 1;

      if (comment.parentCommentId !== undefined) {
        const parent = await ctx.db.get("comments", comment.parentCommentId);
        if (parent !== null) {
          await ctx.db.patch("comments", parent._id, {
            replyCount: Math.max(0, parent.replyCount - 1),
          });
        }
      }
    }

    if (entry !== null && deletedComments > 0) {
      await ctx.db.patch("entries", entry._id, {
        commentCount: Math.max(0, entry.commentCount - deletedComments),
      });
    }

    const remainingPending = await ctx.db
      .query("comments")
      .withIndex("by_entry_deletion_root", (q) =>
        q.eq("entryId", root.entryId).eq("deletionRootId", deletionRootId),
      )
      .first();
    if (remainingPending !== null) {
      await scheduleCommentCleanup(ctx, root._id);
      return { processed, hasMore: true };
    }

    return { processed, hasMore: false };
  },
});

export const setLike = mutation({
  args: {
    actorId: v.string(),
    commentId: v.id("comments"),
    desiredState: v.boolean(),
    includeCallbackContext: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({
      active: v.boolean(),
      likeCount: v.number(),
    }),
    v.object({
      changed: v.literal(false),
      active: v.boolean(),
      transition: v.null(),
      previousCount: v.number(),
      count: v.number(),
    }),
    v.object({
      changed: v.literal(true),
      active: v.boolean(),
      transition: v.union(v.literal("added"), v.literal("removed")),
      previousCount: v.number(),
      count: v.number(),
      comment: v.object({
        id: v.id("comments"),
        actorId: v.string(),
        entryId: v.id("entries"),
        parentCommentId: v.optional(v.id("comments")),
        body: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    const comment = await ctx.db.get("comments", args.commentId);
    if (comment === null) throw new ConvexError("Comment not found.");
    const entry = await ctx.db.get("entries", comment.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }
    if (!(await commentIsLive(ctx, comment))) {
      throw new ConvexError("Comment is being deleted.");
    }

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_comment_actor", (q) =>
        q.eq("commentId", args.commentId).eq("actorId", args.actorId),
      )
      .unique();

    if (args.desiredState && existing === null) {
      await ctx.db.insert("reactions", {
        actorId: args.actorId,
        commentId: args.commentId,
      });
      const likeCount = comment.likeCount + 1;
      await ctx.db.patch("comments", args.commentId, { likeCount });
      if (!args.includeCallbackContext) {
        return { active: true, likeCount };
      }
      return {
        changed: true as const,
        active: true,
        transition: "added" as const,
        previousCount: comment.likeCount,
        count: likeCount,
        comment: {
          id: comment._id,
          actorId: comment.actorId,
          entryId: comment.entryId,
          ...(comment.parentCommentId === undefined
            ? {}
            : { parentCommentId: comment.parentCommentId }),
          body: comment.body,
        },
      };
    }

    if (!args.desiredState && existing !== null) {
      await ctx.db.delete("reactions", existing._id);
      const likeCount = Math.max(0, comment.likeCount - 1);
      await ctx.db.patch("comments", args.commentId, { likeCount });
      if (!args.includeCallbackContext) {
        return { active: false, likeCount };
      }
      return {
        changed: true as const,
        active: false,
        transition: "removed" as const,
        previousCount: comment.likeCount,
        count: likeCount,
        comment: {
          id: comment._id,
          actorId: comment.actorId,
          entryId: comment.entryId,
          ...(comment.parentCommentId === undefined
            ? {}
            : { parentCommentId: comment.parentCommentId }),
          body: comment.body,
        },
      };
    }

    if (!args.includeCallbackContext) {
      return { active: args.desiredState, likeCount: comment.likeCount };
    }
    return {
      changed: false as const,
      active: args.desiredState,
      transition: null,
      previousCount: comment.likeCount,
      count: comment.likeCount,
    };
  },
});
