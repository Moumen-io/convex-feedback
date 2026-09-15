import { paginator } from "convex-helpers/server/pagination";
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
 * best-effort basis so deleted entries/comments remain visible as orphaned
 * activity records instead of aborting the whole page.
 */
export const listByActor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorId: v.string(),
  },
  returns: paginationResultValidator(feedbackReactionValidator),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);

    const db = paginator(ctx.db, schema);
    const result = await db
      .query("reactions")
      .withIndex("by_actor", (q) => q.eq("actorId", args.actorId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((reaction) => serializeActivityReaction(ctx, reaction)),
      ),
    };
  },
});
