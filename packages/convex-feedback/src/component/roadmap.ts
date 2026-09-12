import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import {
  normalizeRequiredText,
  serializeAdminEntry,
  serializeRoadmapItem,
} from "./helpers.js";
import {
  actorValidator,
  adminEntryValidator,
  roadmapItemValidator,
  roadmapStatusValidator,
} from "./model.js";

const POSITION_STEP = 1_000_000;
const MIN_POSITION_GAP = 1;

function assertAdmin(actor: { id: string; isAdmin: boolean }): void {
  if (!actor.isAdmin) throw new ConvexError("Admin access is required.");
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
    const result =
      status === undefined
        ? await ctx.db
            .query("roadmap")
            .withIndex("by_position")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("roadmap")
            .withIndex("by_status_and_position", (q) => q.eq("status", status))
            .paginate(args.paginationOpts);
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
      .withSearchIndex("search_title", (q) => q.search("title", searchQuery))
      .take(Math.min(Math.floor(args.limit), 50));
    return items.map(serializeRoadmapItem);
  },
});

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
    const last = await ctx.db
      .query("roadmap")
      .withIndex("by_status_and_position", (q) => q.eq("status", args.status))
      .order("desc")
      .first();
    const now = Date.now();
    return await ctx.db.insert("roadmap", {
      title: normalizeRequiredText(args.title, "Roadmap title", 160),
      ...(optionalDescription(args.description) === undefined
        ? {}
        : { description: optionalDescription(args.description) }),
      status: args.status,
      position: (last?.position ?? 0) + POSITION_STEP,
      feedbackCount: 0,
      createdAt: now,
      updatedAt: now,
    });
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
    if ((await ctx.db.get("roadmap", args.roadmapId)) === null) {
      throw new ConvexError("Roadmap item not found.");
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

    let previousPosition = previous?.position;
    let nextPosition = next?.position;

    if (
      previous !== null &&
      next !== null &&
      next.position - previous.position <= MIN_POSITION_GAP
    ) {
      const stageItems = await ctx.db
        .query("roadmap")
        .withIndex("by_status_and_position", (q) => q.eq("status", args.status))
        .order("asc")
        .collect();
      const rebalancedPositions = new Map<string, number>();

      for (const [index, stageItem] of stageItems.entries()) {
        const rebalancedPosition = (index + 1) * POSITION_STEP;
        rebalancedPositions.set(stageItem._id, rebalancedPosition);
        if (stageItem.position !== rebalancedPosition) {
          await ctx.db.patch("roadmap", stageItem._id, {
            position: rebalancedPosition,
          });
        }
      }

      previousPosition = rebalancedPositions.get(previous._id);
      nextPosition = rebalancedPositions.get(next._id);
      if (previousPosition === undefined || nextPosition === undefined) {
        throw new ConvexError("Unable to rebalance roadmap stage.");
      }
    }

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
    return position;
  },
});

export const remove = mutation({
  args: { actor: actorValidator, roadmapId: v.id("roadmap") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    if ((await ctx.db.get("roadmap", args.roadmapId)) === null) return null;
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_roadmap_id", (q) => q.eq("roadmapId", args.roadmapId))
      .collect();
    for (const entry of entries) {
      await ctx.db.patch("entries", entry._id, { roadmapId: undefined });
    }
    await ctx.db.delete("roadmap", args.roadmapId);
    return null;
  },
});

export const attachFeedback = mutation({
  args: {
    actor: actorValidator,
    roadmapId: v.id("roadmap"),
    entryId: v.id("entries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const [item, entry] = await Promise.all([
      ctx.db.get("roadmap", args.roadmapId),
      ctx.db.get("entries", args.entryId),
    ]);
    if (item === null) throw new ConvexError("Roadmap item not found.");
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.roadmapId === args.roadmapId) return null;

    if (entry.roadmapId !== undefined) {
      const previous = await ctx.db.get("roadmap", entry.roadmapId);
      if (previous !== null) {
        await ctx.db.patch("roadmap", previous._id, {
          feedbackCount: Math.max(0, previous.feedbackCount - 1),
          updatedAt: Date.now(),
        });
      }
    }
    await ctx.db.patch("entries", args.entryId, {
      roadmapId: args.roadmapId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("roadmap", args.roadmapId, {
      feedbackCount: item.feedbackCount + 1,
      updatedAt: Date.now(),
    });
    return null;
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
    viewerActorId: v.string(),
  },
  returns: paginationResultValidator(adminEntryValidator),
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
          serializeAdminEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});
