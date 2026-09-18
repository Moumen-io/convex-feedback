import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationResult,
} from "convex/server";
import { ConvexError, v, type Infer } from "convex/values";

import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { internalMutation, mutation, query } from "./_generated/server.js";
import {
  normalizeRequiredText,
  serializeEntry,
  serializeRoadmapItem,
} from "./helpers.js";
import type { MutationCtx, QueryCtx } from "./types.js";
import {
  actorValidator,
  actorIsAdmin,
  publicEntryValidator,
  roadmapItemValidator,
  roadmapStatusValidator,
} from "./model.js";
import type { RoadmapStatus } from "./model.js";
import schema from "./schema.js";

const POSITION_STEP = 1_000_000;
const REBALANCE_GAP_THRESHOLD = 10;
const rebalanceBatchSize = 100;
const deletionBatchSize = 100;
const roadmapStatuses = ["planned", "in_progress", "shipped"] as const;

type RebalanceCtx = MutationCtx | QueryCtx;
type RoadmapDatabase = ReturnType<typeof paginator<typeof schema>>;
type RoadmapPaginationOpts = Infer<typeof paginationOptsValidator>;
type RoadmapItemPage = PaginationResult<
  ReturnType<typeof serializeRoadmapItem>
>;

type RoadmapListStreamState = {
  cursor: string | null;
  offset: number;
  done: boolean;
  generation: string | null;
};

type RoadmapListCursor = {
  version: 1;
  streams: RoadmapListStreamState[];
};

type RoadmapStatusPage = RoadmapItemPage & {
  generation: string | null;
};

type RoadmapPageStream = {
  stream: RoadmapListStreamState;
  result: RoadmapStatusPage;
};

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

async function getRebalanceState(ctx: RebalanceCtx, status: RoadmapStatus) {
  return await ctx.db
    .query("roadmapRebalances")
    .withIndex("by_status", (q) => q.eq("status", status))
    .first();
}

async function resetRebalance(
  ctx: MutationCtx,
  statuses: RoadmapStatus[],
): Promise<void> {
  for (const status of new Set(statuses)) {
    const state = await getRebalanceState(ctx, status);
    if (
      state !== null &&
      (state.activeGeneration !== undefined ||
        state.visibleGeneration !== undefined)
    ) {
      await ctx.db.patch("roadmapRebalances", state._id, {
        activeGeneration: undefined,
        visibleGeneration: undefined,
      });
    }
  }
}

async function assertNoRebalancePromotion(
  ctx: MutationCtx,
  statuses: RoadmapStatus[],
): Promise<void> {
  for (const status of new Set(statuses)) {
    const state = await getRebalanceState(ctx, status);
    if (
      state?.activeGeneration !== undefined &&
      state.activeGeneration === state.visibleGeneration
    ) {
      throw new ConvexError("Roadmap is being rebalanced. Please retry.");
    }
  }
}

async function scheduleRebalance(
  ctx: MutationCtx,
  status: RoadmapStatus,
): Promise<void> {
  const state = await getRebalanceState(ctx, status);
  const generationNumber = (state?.nextGeneration ?? 0) + 1;
  const rebalanceId = String(generationNumber);
  if (state === null) {
    await ctx.db.insert("roadmapRebalances", {
      status,
      nextGeneration: generationNumber,
      activeGeneration: rebalanceId,
    });
  } else {
    await ctx.db.patch("roadmapRebalances", state._id, {
      nextGeneration: generationNumber,
      activeGeneration: rebalanceId,
    });
  }
  await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
    status,
    rebalanceId,
    phase: "mark",
    paginationOpts: { cursor: null, numItems: rebalanceBatchSize },
    offset: 0,
  });
}

function newRoadmapListStreamState(
  generation: string | null = null,
): RoadmapListStreamState {
  return { cursor: null, offset: 0, done: false, generation };
}

function initialRoadmapListCursor(): RoadmapListCursor {
  return {
    version: 1,
    streams: roadmapStatuses.map(() => newRoadmapListStreamState()),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRoadmapListStreamState(
  value: unknown,
): value is RoadmapListStreamState {
  if (!isRecord(value)) return false;
  return (
    (value.cursor === null || typeof value.cursor === "string") &&
    typeof value.offset === "number" &&
    Number.isInteger(value.offset) &&
    value.offset >= 0 &&
    typeof value.done === "boolean" &&
    (value.generation === null || typeof value.generation === "string")
  );
}

function decodeRoadmapListCursor(cursor: string | null): RoadmapListCursor {
  if (cursor === null) return initialRoadmapListCursor();

  let value: unknown;
  try {
    value = JSON.parse(cursor) as unknown;
  } catch {
    throw new ConvexError("InvalidCursor");
  }

  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.streams) ||
    value.streams.length !== roadmapStatuses.length ||
    !value.streams.every(isRoadmapListStreamState)
  ) {
    throw new ConvexError("InvalidCursor");
  }

  return {
    version: 1,
    streams: value.streams.map((stream) => ({ ...stream })),
  };
}

function encodeRoadmapListCursor(cursor: RoadmapListCursor): string {
  return JSON.stringify(cursor);
}

async function paginateRoadmapStatus(
  ctx: QueryCtx,
  db: RoadmapDatabase,
  status: RoadmapStatus,
  paginationOpts: RoadmapPaginationOpts,
): Promise<RoadmapStatusPage> {
  const state = await getRebalanceState(ctx, status);
  const generation = state?.visibleGeneration ?? null;
  const roadmapQuery =
    generation === null
      ? db
          .query("roadmap")
          .withIndex("by_status_deleting_at_position", (q) =>
            q.eq("status", status).eq("deletingAt", undefined),
          )
      : db
          .query("roadmap")
          .withIndex("by_status_deleting_at_rebalance_id_position", (q) =>
            q
              .eq("status", status)
              .eq("deletingAt", undefined)
              .eq("rebalanceId", generation),
          );
  const result = await roadmapQuery.paginate(paginationOpts);

  return {
    ...result,
    generation,
    page: result.page.map((item) =>
      serializeRoadmapItem(
        item,
        generation === null ? undefined : item.rebalancePosition,
      ),
    ),
  };
}

function compareRoadmapItems(
  left: RoadmapItemPage["page"][number],
  right: RoadmapItemPage["page"][number],
): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  if (left.creationTime !== right.creationTime) {
    return left.creationTime - right.creationTime;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function mergeRoadmapPages(
  pages: Array<RoadmapPageStream | null>,
  offsets: number[],
  limit: number,
) {
  const page: RoadmapItemPage["page"] = [];

  while (page.length < limit) {
    let selectedIndex = -1;
    for (const [index, value] of pages.entries()) {
      if (value === null) continue;
      const item = value.result.page[offsets[index]!];
      if (item === undefined) continue;
      const selected =
        selectedIndex < 0
          ? undefined
          : pages[selectedIndex]!.result.page[offsets[selectedIndex]!];
      if (selected === undefined || compareRoadmapItems(item, selected) < 0) {
        selectedIndex = index;
      }
    }
    if (selectedIndex < 0) break;
    page.push(pages[selectedIndex]!.result.page[offsets[selectedIndex]!]!);
    offsets[selectedIndex]! += 1;
  }

  return page;
}

async function paginateUnfilteredRoadmapRange(
  ctx: QueryCtx,
  db: RoadmapDatabase,
  paginationOpts: RoadmapPaginationOpts,
  startCursor: RoadmapListCursor,
  endCursor: RoadmapListCursor,
): Promise<RoadmapItemPage> {
  const generations = await Promise.all(
    roadmapStatuses.map(async (status) => {
      const state = await getRebalanceState(ctx, status);
      return state?.visibleGeneration ?? null;
    }),
  );
  if (
    startCursor.streams.some(
      (stream, index) =>
        stream.generation !== generations[index] ||
        endCursor.streams[index]!.generation !== generations[index],
    )
  ) {
    throw new ConvexError("InvalidCursor");
  }

  const pages = await Promise.all(
    roadmapStatuses.map(async (status, index) => {
      const start = startCursor.streams[index]!;
      const end = endCursor.streams[index]!;
      if (start.generation !== end.generation) {
        throw new ConvexError("InvalidCursor");
      }
      if (start.done) return null;

      if (start.cursor === end.cursor) {
        if (end.offset <= start.offset) return null;
        const result = await paginateRoadmapStatus(ctx, db, status, {
          cursor: start.cursor,
          numItems: end.offset,
        });
        return { stream: start, result };
      }

      if (end.cursor === null) {
        throw new ConvexError("InvalidCursor");
      }
      const result = await paginateRoadmapStatus(ctx, db, status, {
        cursor: start.cursor,
        endCursor: end.cursor,
        numItems: paginationOpts.numItems,
      });
      return { stream: start, result };
    }),
  );
  const offsets = pages.map((page) => page?.stream.offset ?? 0);

  return {
    page: mergeRoadmapPages(pages, offsets, Number.POSITIVE_INFINITY),
    isDone: endCursor.streams.every((stream) => stream.done),
    continueCursor: encodeRoadmapListCursor(endCursor),
  };
}

/**
 * Unfiltered reads merge one stable stream per status. Each stream is pinned
 * to the generation visible in the query snapshot, so promotion batches can
 * never leak a mixture of live and replacement positions.
 */
async function paginateUnfilteredRoadmap(
  ctx: QueryCtx,
  db: RoadmapDatabase,
  paginationOpts: RoadmapPaginationOpts,
): Promise<RoadmapItemPage> {
  const cursor = decodeRoadmapListCursor(paginationOpts.cursor);
  if (
    paginationOpts.endCursor !== undefined &&
    paginationOpts.endCursor !== null
  ) {
    return await paginateUnfilteredRoadmapRange(
      ctx,
      db,
      paginationOpts,
      cursor,
      decodeRoadmapListCursor(paginationOpts.endCursor),
    );
  }
  const generations = await Promise.all(
    roadmapStatuses.map(async (status) => {
      const state = await getRebalanceState(ctx, status);
      return state?.visibleGeneration ?? null;
    }),
  );
  const streams = cursor.streams.map((stream, index) =>
    stream.generation === generations[index]
      ? stream
      : newRoadmapListStreamState(generations[index]),
  );
  const pages = await Promise.all(
    roadmapStatuses.map(async (status, index) => {
      const stream = streams[index]!;
      if (stream.done) return null;

      const result = await paginateRoadmapStatus(ctx, db, status, {
        ...paginationOpts,
        cursor: stream.cursor,
        endCursor: undefined,
        numItems: Math.max(
          paginationOpts.numItems,
          stream.offset + paginationOpts.numItems,
        ),
      });

      return { stream, result };
    }),
  );
  const nextStreams = streams.map((stream) => ({ ...stream }));
  const offsets = pages.map((page) => page?.stream.offset ?? 0);
  const page = mergeRoadmapPages(pages, offsets, paginationOpts.numItems);

  for (const [index, value] of pages.entries()) {
    if (value === null) continue;
    const stream = nextStreams[index]!;
    const result = value.result;
    const consumed = offsets[index]! - value.stream.offset;
    const pageExhausted = offsets[index]! >= result.page.length;
    stream.generation = result.generation;
    if (pageExhausted) {
      stream.done = result.isDone;
      if (result.isDone) {
        // Keep the source page boundary even when the paginator uses "[]" as
        // its terminal cursor, so a bound previous-page query can reproduce
        // exactly the same range.
        stream.cursor = value.stream.cursor;
        stream.offset = result.page.length;
      } else {
        stream.cursor = result.continueCursor;
        stream.offset = 0;
      }
    } else {
      stream.done = false;
      stream.cursor = value.stream.cursor;
      stream.offset = value.stream.offset + consumed;
    }
  }

  const nextCursor: RoadmapListCursor = {
    version: 1,
    streams: nextStreams,
  };
  return {
    page,
    isDone: nextStreams.every((stream) => stream.done),
    continueCursor: encodeRoadmapListCursor(nextCursor),
  };
}

export const get = query({
  args: { roadmapId: v.id("roadmap") },
  returns: v.union(roadmapItemValidator, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get("roadmap", args.roadmapId);
    if (item === null || item.deletingAt !== undefined) return null;

    const state = await getRebalanceState(ctx, item.status);
    return serializeRoadmapItem(
      item,
      state?.visibleGeneration === undefined
        ? undefined
        : item.rebalancePosition,
    );
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(roadmapStatusValidator),
  },
  returns: paginationResultValidator(roadmapItemValidator),
  handler: async (ctx, args) => {
    const db = paginator(ctx.db, schema);
    const status = args.status;
    if (status === undefined) {
      return await paginateUnfilteredRoadmap(ctx, db, args.paginationOpts);
    }

    const result = await paginateRoadmapStatus(
      ctx,
      db,
      status,
      args.paginationOpts,
    );
    const { generation: _generation, ...publicResult } = result;
    void _generation;
    return publicResult;
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
  await assertNoRebalancePromotion(ctx, [args.status]);
  await resetRebalance(ctx, [args.status]);
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

    await assertNoRebalancePromotion(ctx, [item.status, args.status]);
    await resetRebalance(ctx, [item.status, args.status]);

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
      rebalanceId: undefined,
      rebalanceRank: undefined,
      rebalancePosition: undefined,
      updatedAt: Date.now(),
    });
    if (shouldScheduleRebalance) {
      await scheduleRebalance(ctx, args.status);
    }
    return position;
  },
});

export const rebalanceBatch = internalMutation({
  args: {
    status: roadmapStatusValidator,
    rebalanceId: v.string(),
    phase: v.union(
      v.literal("mark"),
      v.literal("rewrite"),
      v.literal("promote"),
    ),
    paginationOpts: paginationOptsValidator,
    offset: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const db = paginator(ctx.db, schema);
    const state = await getRebalanceState(ctx, args.status);
    if (state?.activeGeneration !== args.rebalanceId) return null;

    if (args.phase === "mark") {
      const result = await db
        .query("roadmap")
        .withIndex("by_status_deleting_at_position", (q) =>
          q.eq("status", args.status).eq("deletingAt", undefined),
        )
        .order("asc")
        .paginate(args.paginationOpts);

      for (const [index, item] of result.page.entries()) {
        await ctx.db.patch("roadmap", item._id, {
          rebalanceId: args.rebalanceId,
          rebalanceRank: args.offset + index,
          rebalancePosition: undefined,
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

    const result = await db
      .query("roadmap")
      .withIndex("by_status_rebalance_rank", (q) =>
        q.eq("status", args.status).eq("rebalanceId", args.rebalanceId),
      )
      .order("asc")
      .paginate(args.paginationOpts);

    for (const [index, item] of result.page.entries()) {
      const position = (args.offset + index + 1) * POSITION_STEP;
      if (args.phase === "rewrite") {
        await ctx.db.patch("roadmap", item._id, {
          rebalancePosition: position,
        });
      } else {
        if (item.rebalancePosition === undefined) {
          throw new ConvexError("Roadmap rebalance is incomplete.");
        }
        await ctx.db.patch("roadmap", item._id, {
          position: item.rebalancePosition,
        });
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
        status: args.status,
        rebalanceId: args.rebalanceId,
        phase: args.phase,
        paginationOpts: {
          cursor: result.continueCursor,
          numItems: rebalanceBatchSize,
        },
        offset: args.offset + result.page.length,
      });
    } else if (args.phase === "rewrite") {
      await ctx.db.patch("roadmapRebalances", state._id, {
        visibleGeneration: args.rebalanceId,
      });
      await ctx.scheduler.runAfter(0, internal.roadmap.rebalanceBatch, {
        status: args.status,
        rebalanceId: args.rebalanceId,
        phase: "promote",
        paginationOpts: { cursor: null, numItems: rebalanceBatchSize },
        offset: 0,
      });
    } else {
      await ctx.db.patch("roadmapRebalances", state._id, {
        activeGeneration: undefined,
        visibleGeneration: undefined,
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

    await assertNoRebalancePromotion(ctx, [item.status]);
    await resetRebalance(ctx, [item.status]);
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
    const db = paginator(ctx.db, schema);
    const result = await db
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
