import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { internalMutation, mutation, query } from "./_generated/server.js";
import {
  normalizeRequiredText,
  serializeEntry,
  serializeRoadmapItem,
} from "./helpers.js";
import type { MutationCtx } from "./types.js";
import {
  actorValidator,
  actorIsAdmin,
  publicEntryValidator,
  roadmapItemValidator,
  roadmapStatusValidator,
} from "./model.js";

const POSITION_STEP = 1_000_000;
const REBALANCE_GAP_THRESHOLD = 10;
const rebalanceBatchSize = 100;
const deletionBatchSize = 100;

type RoadmapCreateArgs = {
  title: string;
  description?: string;
  status: "planned" | "in_progress" | "shipped";
};

function assertAdmin(actor: {
  id: string;
  isAdmin?: boolean;
  isModerator?: boolean;
}): void {
  if (!actorIsAdmin(actor)) throw new ConvexError("Admin access is required.");
}

function optionalDescription(value: string | undefined): string | undefined {
  const description = value?.trim();
  if (description === undefined || description.length === 0) return undefined;
  if (description.length > 2_000) {
    throw new ConvexError("Description must be 2000 characters or fewer.");
  }
  return description;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(roadmapStatusValidator),
  },
  returns: paginationResultValidator(roadmapItemValidator),
  handler: async (ctx, args) => {
    const status = args.status;
    const roadmapQuery =
      status === undefined
        ? ctx.db
            .query("roadmap")
            .withIndex("by_deleting_at_and_position", (q) =>
              q.eq("deletingAt", undefined),
            )
        : ctx.db
            .query("roadmap")
            .withIndex("by_status_deleting_at_position", (q) =>
              q.eq("status", status).eq("deletingAt", undefined),
            );
    const result = await roadmapQuery.paginate(args.paginationOpts);
    return { ...result, page: result.page.map(serializeRoadmapItem) };
  },
});

export const search = query({
  args: { searchQuery: v.string(), limit: v.number() },
  returns: v.array(roadmapItemValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();
    if (searchQuery.length === 0 || args.limit <= 0) return [];
    const items = await ctx.db
      .query("roadmap")
      .withSearchIndex("search_title", (q) =>
        q.search("title", searchQuery).eq("deletingAt", undefined),
      )
      .take(Math.min(Math.floor(args.limit), 50));
    return items.map(serializeRoadmapItem);
  },
});

async function createRoadmapRecord(ctx: MutationCtx, args: RoadmapCreateArgs) {
  const last = await ctx.db
    .query("roadmap")
    .withIndex("by_status_and_position", (q) => q.eq("status", args.status))
    .order("desc")
    .first();
  const description = optionalDescription(args.description);
  const now = Date.now();
  return await ctx.db.insert("roadmap", {
    title: normalizeRequiredText(args.title, "Roadmap title", 160),
    ...(description === undefined ? {} : { description }),
    status: args.status,
    position: (last?.position ?? 0) + POSITION_STEP,
    feedbackCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export const create = mutation({
  args: {
    actor: actorValidator,
    title: v.string(),
    description: v.optional(v.string()),
    status: roadmapStatusValidator,
  },
  returns: v.id("roadmap"),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    return await createRoadmapRecord(ctx, args);
  },
});

export const update = mutation({
  args: {
    actor: actorValidator,
    roadmapId: v.id("roadmap"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const item = await ctx.db.get("roadmap", args.roadmapId);
    if (item === null) {
      throw new ConvexError("Roadmap item not found.");
    }
    if (item.deletingAt !== undefined) {
      throw new ConvexError("Roadmap item is being deleted.");
    }
    await ctx.db.patch("roadmap", args.roadmapId, {
      title: normalizeRequiredText(args.title, "Roadmap title", 160),
      description: optionalDescription(args.description),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const move = mutation({
  args: {
    actor: actorValidator,
    roadmapId: v.id("roadmap"),
    status: roadmapStatusValidator,
    previousItemId: v.optional(v.id("roadmap")),
    nextItemId: v.optional(v.id("roadmap")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const [item, previous, next] = await Promise.all([
      ctx.db.get("roadmap", args.roadmapId),
      args.previousItemId === undefined
        ? null
        : ctx.db.get("roadmap", args.previousItemId),
      args.nextItemId === undefined
        ? null
        : ctx.db.get("roadmap", args.nextItemId),
    ]);
    if (item === null) throw new ConvexError("Roadmap item not found.");
    if (
      args.previousItemId === args.roadmapId ||
      args.nextItemId === args.roadmapId
    ) {
      throw new ConvexError("Roadmap item cannot be its own neighbor.");
    }
    if (args.previousItemId !== undefined && previous === null) {
      throw new ConvexError("Previous roadmap item not found.");
    }
    if (args.nextItemId !== undefined && next === null) {
      throw new ConvexError("Next roadmap item not found.");
    }
    if (item.deletingAt !== undefined) {
      throw new ConvexError("Roadmap item is being deleted.");
    }
    if (previous !== null && previous.status !== args.status) {
      throw new ConvexError("Previous item is not in the target stage.");
    }
    if (next !== null && next.status !== args.status) {
      throw new ConvexError("Next item is not in the target stage.");
    }
    if (
      previous !== null &&
      next !== null &&
      previous.position >= next.position
    ) {
      throw new ConvexError("Roadmap neighbors are out of order.");
    }

    const previousPosition = previous?.position;
    const nextPosition = next?.position;

    const shouldScheduleRebalance =
      previous !== null &&
      next !== null &&
      next.position - previous.position <= REBALANCE_GAP_THRESHOLD;

    let position: number;
    if (previousPosition !== undefined && nextPosition !== undefined) {
      position = previousPosition + (nextPosition - previousPosition) / 2;
    } else if (previousPosition !== undefined) {
      position = previousPosition + POSITION_STEP;
    } else if (nextPosition !== undefined) {
      position = nextPosition - POSITION_STEP;
    } else {
      const last = await ctx.db
        .query("roadmap")
        .withIndex("by_status_and_position", (q) => q.eq("status", args.status))
        .order("desc")
        .first();
      position = (last?.position ?? 0) + POSITION_STEP;
    }
    await ctx.db.patch("roadmap", args.roadmapId, {
      status: args.status,
      position,
      updatedAt: Date.now(),
    });
    if (shouldScheduleRebalance) {
      await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
        status: args.status,
        rebalanceId: `${args.roadmapId}:${Date.now()}`,
        phase: "mark",
        paginationOpts: { cursor: null, numItems: rebalanceBatchSize },
        offset: 0,
      });
    }
    return position;
  },
});

export const rebalanceBatch = internalMutation({
  args: {
    status: roadmapStatusValidator,
    rebalanceId: v.string(),
    phase: v.union(v.literal("mark"), v.literal("rewrite")),
    paginationOpts: paginationOptsValidator,
    offset: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.phase === "mark") {
      const result = await ctx.db
        .query("roadmap")
        .withIndex("by_status_and_position", (q) => q.eq("status", args.status))
        .order("asc")
        .paginate(args.paginationOpts);

      for (const [index, item] of result.page.entries()) {
        await ctx.db.patch("roadmap", item._id, {
          rebalanceId: args.rebalanceId,
          rebalanceRank: args.offset + index,
        });
      }

      if (result.isDone) {
        await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
          status: args.status,
          rebalanceId: args.rebalanceId,
          phase: "rewrite",
          paginationOpts: { cursor: null, numItems: rebalanceBatchSize },
          offset: 0,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
          status: args.status,
          rebalanceId: args.rebalanceId,
          phase: "mark",
          paginationOpts: {
            cursor: result.continueCursor,
            numItems: rebalanceBatchSize,
          },
          offset: args.offset + result.page.length,
        });
      }
      return null;
    }

    const result = await ctx.db
      .query("roadmap")
      .withIndex("by_status_rebalance_rank", (q) =>
        q.eq("status", args.status).eq("rebalanceId", args.rebalanceId),
      )
      .order("asc")
      .paginate(args.paginationOpts);

    for (const [index, item] of result.page.entries()) {
      await ctx.db.patch("roadmap", item._id, {
        position: (args.offset + index + 1) * POSITION_STEP,
      });
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
        status: args.status,
        rebalanceId: args.rebalanceId,
        phase: "rewrite",
        paginationOpts: {
          cursor: result.continueCursor,
          numItems: rebalanceBatchSize,
        },
        offset: args.offset + result.page.length,
      });
    }
    return null;
  },
});

export const remove = mutation({
  args: { actor: actorValidator, roadmapId: v.id("roadmap") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const item = await ctx.db.get("roadmap", args.roadmapId);
    if (item === null || item.deletingAt !== undefined) return null;

    await ctx.db.patch("roadmap", args.roadmapId, { deletingAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.roadmap.removeBatch, {
      roadmapId: args.roadmapId,
    });
    return null;
  },
});

export const removeBatch = internalMutation({
  args: { roadmapId: v.id("roadmap") },
  returns: v.object({ processed: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("roadmap", args.roadmapId);
    if (item === null || item.deletingAt === undefined) {
      return { processed: 0, hasMore: false };
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_roadmap_id", (q) => q.eq("roadmapId", args.roadmapId))
      .take(deletionBatchSize);
    const now = Date.now();
    for (const entry of entries) {
      await ctx.db.patch("entries", entry._id, {
        roadmapId: undefined,
        updatedAt: now,
      });
    }

    const hasMore = entries.length === deletionBatchSize;
    if (hasMore) {
      await ctx.scheduler.runAfter(0, internal.roadmap.removeBatch, {
        roadmapId: args.roadmapId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.roadmap.finalizeRemoval, {
        roadmapId: args.roadmapId,
      });
    }

    return { processed: entries.length, hasMore };
  },
});

export const finalizeRemoval = internalMutation({
  args: { roadmapId: v.id("roadmap") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("roadmap", args.roadmapId);
    if (item === null || item.deletingAt === undefined) return null;
    await ctx.db.delete("roadmap", args.roadmapId);
    return null;
  },
});

async function attachFeedbackRecord(
  ctx: MutationCtx,
  roadmapId: Id<"roadmap">,
  entryId: Id<"entries">,
): Promise<void> {
  const [item, entry] = await Promise.all([
    ctx.db.get("roadmap", roadmapId),
    ctx.db.get("entries", entryId),
  ]);
  if (item === null) throw new ConvexError("Roadmap item not found.");
  if (item.deletingAt !== undefined) {
    throw new ConvexError("Roadmap item is being deleted.");
  }
  if (entry === null) throw new ConvexError("Entry not found.");
  if (entry.roadmapId === roadmapId) return;

  const now = Date.now();
  if (entry.roadmapId !== undefined) {
    const previous = await ctx.db.get("roadmap", entry.roadmapId);
    if (previous !== null) {
      await ctx.db.patch("roadmap", previous._id, {
        feedbackCount: Math.max(0, previous.feedbackCount - 1),
        updatedAt: now,
      });
    }
  }
  await ctx.db.patch("entries", entryId, {
    roadmapId,
    updatedAt: now,
  });
  await ctx.db.patch("roadmap", roadmapId, {
    feedbackCount: item.feedbackCount + 1,
    updatedAt: now,
  });
}

export const attachFeedback = mutation({
  args: {
    actor: actorValidator,
    roadmapId: v.id("roadmap"),
    entryId: v.id("entries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    await attachFeedbackRecord(ctx, args.roadmapId, args.entryId);
    return null;
  },
});

export const createForEntry = mutation({
  args: {
    actor: actorValidator,
    title: v.string(),
    description: v.optional(v.string()),
    status: roadmapStatusValidator,
    entryId: v.id("entries"),
  },
  returns: v.id("roadmap"),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const roadmapId = await createRoadmapRecord(ctx, args);
    await attachFeedbackRecord(ctx, roadmapId, args.entryId);
    return roadmapId;
  },
});

export const detachFeedback = mutation({
  args: { actor: actorValidator, entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.roadmapId === undefined) return null;
    const item = await ctx.db.get("roadmap", entry.roadmapId);
    await ctx.db.patch("entries", args.entryId, {
      roadmapId: undefined,
      updatedAt: Date.now(),
    });
    if (item !== null) {
      await ctx.db.patch("roadmap", item._id, {
        feedbackCount: Math.max(0, item.feedbackCount - 1),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const listFeedback = query({
  args: {
    paginationOpts: paginationOptsValidator,
    roadmapId: v.id("roadmap"),
    viewerActorId: v.optional(v.string()),
  },
  returns: paginationResultValidator(publicEntryValidator),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("entries")
      .withIndex("by_roadmap_id", (q) => q.eq("roadmapId", args.roadmapId))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((entry) =>
          serializeEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});
