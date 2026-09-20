import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel.js";
import { mutation, query } from "./_generated/server.js";
import {
  assertActorId,
  assertPositiveInteger,
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
    if (args.parentCommentId !== undefined) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent === null || parent.entryId !== args.entryId) {
        throw new ConvexError("Parent comment not found on this entry.");
      }
    }

    const db = paginator(ctx.db, schema);
    const result =
      args.sort === "top"
        ? await db
            .query("comments")
            .withIndex("by_entry_parent_likes", (q) =>
              q
                .eq("entryId", args.entryId)
                .eq("parentCommentId", args.parentCommentId),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await db
            .query("comments")
            .withIndex("by_entry_parent", (q) =>
              q
                .eq("entryId", args.entryId)
                .eq("parentCommentId", args.parentCommentId),
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
 * Unlike the ordinary conversation query, this activity query retains the
 * stored body of soft-deleted comments and resolves only the parent entry
 * title. It does not load a parent comment body.
 */
export const listByActor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorId: v.string(),
  },
  returns: paginationResultValidator(activityCommentValidator),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);

    const db = paginator(ctx.db, schema);
    const result = await db
      .query("comments")
      .withIndex("by_actor", (q) => q.eq("actorId", args.actorId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((comment) => serializeActivityComment(ctx, comment)),
      ),
    };
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
  },
  returns: v.object({
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
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    assertPositiveInteger(args.maxDepth, "Maximum comment depth");
    assertPositiveInteger(args.maxCommentLength, "Maximum comment length");

    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");

    const body = normalizeRequiredText(
      args.body,
      "Comment",
      args.maxCommentLength,
    );

    let depth = 0;
    let parentComment: { id: Id<"comments">; actorId: string } | undefined;
    if (args.parentCommentId !== undefined) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent === null || parent.entryId !== args.entryId) {
        throw new ConvexError("Parent comment not found on this entry.");
      }
      parentComment = { id: parent._id, actorId: parent.actorId };
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

    if (args.parentCommentId !== undefined) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent !== null) {
        await ctx.db.patch("comments", args.parentCommentId, {
          replyCount: parent.replyCount + 1,
        });
      }
    }

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
      ...(parentComment === undefined ? {} : { parentComment }),
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
    if (comment.deletedAt !== undefined) {
      throw new ConvexError("Deleted comments cannot be edited.");
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
    if (comment === null) throw new ConvexError("Comment not found.");
    if (comment.deletedAt !== undefined) return null;

    const canDelete =
      actorIsAdmin(args.actor) ||
      (args.deletableByAuthor && comment.actorId === args.actor.id);
    if (!canDelete) {
      throw new ConvexError("Not authorized to delete this comment.");
    }

    await ctx.db.patch("comments", args.commentId, { deletedAt: Date.now() });
    return null;
  },
});

export const setLike = mutation({
  args: {
    actorId: v.string(),
    commentId: v.id("comments"),
    desiredState: v.boolean(),
  },
  returns: v.union(
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
      entry: v.object({
        id: v.id("entries"),
        actorId: v.string(),
        title: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    const comment = await ctx.db.get("comments", args.commentId);
    if (comment === null) throw new ConvexError("Comment not found.");
    if (comment.deletedAt !== undefined) {
      throw new ConvexError("Deleted comments cannot receive likes.");
    }

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_comment_actor", (q) =>
        q.eq("commentId", args.commentId).eq("actorId", args.actorId),
      )
      .unique();

    if (args.desiredState && existing === null) {
      const entry = await ctx.db.get("entries", comment.entryId);
      if (entry === null) throw new ConvexError("Entry not found.");
      await ctx.db.insert("reactions", {
        actorId: args.actorId,
        commentId: args.commentId,
      });
      const likeCount = comment.likeCount + 1;
      await ctx.db.patch("comments", args.commentId, { likeCount });
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
        entry: {
          id: entry._id,
          actorId: entry.actorId,
          title: entry.title,
        },
      };
    }

    if (!args.desiredState && existing !== null) {
      const entry = await ctx.db.get("entries", comment.entryId);
      if (entry === null) throw new ConvexError("Entry not found.");
      await ctx.db.delete("reactions", existing._id);
      const likeCount = Math.max(0, comment.likeCount - 1);
      await ctx.db.patch("comments", args.commentId, { likeCount });
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
        entry: {
          id: entry._id,
          actorId: entry.actorId,
          title: entry.title,
        },
      };
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
