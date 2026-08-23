import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import {
  assertActorId,
  assertPositiveInteger,
  normalizeRequiredText,
  serializeComment,
} from "./helpers.js";
import {
  actorValidator,
  commentSortValidator,
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

export const create = mutation({
  args: {
    actorId: v.string(),
    entryId: v.id("entries"),
    parentCommentId: v.optional(v.id("comments")),
    body: v.string(),
    maxDepth: v.number(),
    maxCommentLength: v.number(),
  },
  returns: v.id("comments"),
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
    if (args.parentCommentId !== undefined) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent === null || parent.entryId !== args.entryId) {
        throw new ConvexError("Parent comment not found on this entry.");
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
    });

    if (args.parentCommentId !== undefined) {
      const parent = await ctx.db.get("comments", args.parentCommentId);
      if (parent !== null) {
        await ctx.db.patch("comments", args.parentCommentId, {
          replyCount: parent.replyCount + 1,
        });
      }
    }

    return commentId;
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
      args.actor.isModerator ||
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
      args.actor.isModerator ||
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
  returns: v.object({ active: v.boolean(), likeCount: v.number() }),
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
      await ctx.db.insert("reactions", {
        actorId: args.actorId,
        commentId: args.commentId,
      });
      const likeCount = comment.likeCount + 1;
      await ctx.db.patch("comments", args.commentId, { likeCount });
      return { active: true, likeCount };
    }

    if (!args.desiredState && existing !== null) {
      await ctx.db.delete("reactions", existing._id);
      const likeCount = Math.max(0, comment.likeCount - 1);
      await ctx.db.patch("comments", args.commentId, { likeCount });
      return { active: false, likeCount };
    }

    return { active: args.desiredState, likeCount: comment.likeCount };
  },
});
