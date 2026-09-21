import { stream } from "convex-helpers/server/stream";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import {
  assertActorId,
  commentIsLive,
  serializeActivityReaction,
} from "./helpers.js";
import { feedbackReactionValidator } from "./model.js";
import { query } from "./_generated/server.js";
import schema from "./schema.js";

/**
 * List reactions created by a known actor. Target documents are loaded once
 * by the stream mapper and reused by serialization. Reactions whose target or
 * owning entry is missing or pending deletion are omitted.
 */
export const listByActor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorId: v.string(),
  },
  returns: paginationResultValidator(feedbackReactionValidator),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);

    const result = await stream(ctx.db, schema)
      .query("reactions")
      .withIndex("by_actor", (q) => q.eq("actorId", args.actorId))
      .order("desc")
      .map(async (reaction) => {
        if (reaction.entryId !== undefined) {
          const entry = await ctx.db.get("entries", reaction.entryId);
          if (entry === null || entry.deletingAt !== undefined) return null;
          return serializeActivityReaction(reaction, { type: "entry", entry });
        }
        if (reaction.commentId !== undefined) {
          const comment = await ctx.db.get("comments", reaction.commentId);
          if (comment === null || !(await commentIsLive(ctx, comment))) {
            return null;
          }
          const entry = await ctx.db.get("entries", comment.entryId);
          if (entry === null || entry.deletingAt !== undefined) return null;
          return serializeActivityReaction(reaction, {
            type: "comment",
            comment,
            entry,
          });
        }
        return null;
      })
      .paginate(args.paginationOpts);

    return result;
  },
});
