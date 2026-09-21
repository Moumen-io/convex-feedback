import { stream } from "convex-helpers/server/stream";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";

import { assertActorId, serializeActivityReaction } from "./helpers.js";
import { feedbackReactionValidator } from "./model.js";
import { query } from "./_generated/server.js";
import schema from "./schema.js";

/**
 * List reactions created by a known actor. Target documents are resolved on a
 * best-effort basis. Entries that are in the middle of permanent cleanup are
 * hidden immediately; legacy records whose targets were removed outside the
 * component remain representable without aborting the whole page.
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
      .filterWith(async (reaction) => {
        if (reaction.entryId !== undefined) {
          const entry = await ctx.db.get("entries", reaction.entryId);
          return entry === null || entry.deletingAt === undefined;
        }
        if (reaction.commentId !== undefined) {
          const comment = await ctx.db.get("comments", reaction.commentId);
          if (comment === null) return true;
          const entry = await ctx.db.get("entries", comment.entryId);
          return entry === null || entry.deletingAt === undefined;
        }
        return true;
      })
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((reaction) => serializeActivityReaction(ctx, reaction)),
      ),
    };
  },
});
