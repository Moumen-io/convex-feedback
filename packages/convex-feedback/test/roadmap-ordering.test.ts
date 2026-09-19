import { convexTest } from "convex-test";
import { paginator } from "convex-helpers/server/pagination";
import { describe, expect, test, vi } from "vitest";

import { api, internal } from "../src/component/_generated/api.js";
import type { Id } from "../src/component/_generated/dataModel.js";
import schema from "../src/component/schema.js";

const modules = import.meta.glob("../src/component/**/*.ts");
const actor = { id: "admin-1", isAdmin: true } as const;

function setup() {
  return convexTest(schema, modules);
}

async function createRoadmapItem(
  testInstance: ReturnType<typeof setup>,
  title: string,
  status: "planned" | "in_progress" | "shipped" = "planned",
) {
  return await testInstance.mutation(api.roadmap.create, {
    actor,
    title,
    status,
  });
}

describe("roadmap ordering", () => {
  test("places items between their supplied neighbors", async () => {
    const testInstance = setup();
    const firstId = await createRoadmapItem(testInstance, "First");
    const middleId = await createRoadmapItem(testInstance, "Middle");
    const lastId = await createRoadmapItem(testInstance, "Last");

    const position = await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: lastId,
      status: "planned",
      previousItemId: firstId,
      nextItemId: middleId,
    });

    expect(position).toBe(1_500_000);

    const ordered = await testInstance.run((ctx) =>
      ctx.db
        .query("roadmap")
        .withIndex("by_status_and_position", (q) => q.eq("status", "planned"))
        .order("asc")
        .collect(),
    );
    expect(ordered.map((item) => item._id)).toEqual([
      firstId,
      lastId,
      middleId,
    ]);
  });

  test("supports moving into an empty stage", async () => {
    const testInstance = setup();
    const itemId = await createRoadmapItem(testInstance, "Move me");

    const position = await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: itemId,
      status: "in_progress",
    });

    expect(position).toBe(1_000_000);
    const item = await testInstance.run((ctx) => ctx.db.get("roadmap", itemId));
    expect(item?.status).toBe("in_progress");
    expect(item?.position).toBe(1_000_000);
  });

  test("paginates roadmap items across component-safe cursors", async () => {
    const testInstance = setup();
    const itemIds = [
      await createRoadmapItem(testInstance, "First"),
      await createRoadmapItem(testInstance, "Second"),
      await createRoadmapItem(testInstance, "Third"),
    ];

    const firstPage = await testInstance.query(api.roadmap.list, {
      status: "planned",
      paginationOpts: { cursor: null, numItems: 2 },
    });
    const secondPage = await testInstance.query(api.roadmap.list, {
      status: "planned",
      paginationOpts: {
        cursor: firstPage.continueCursor,
        numItems: 2,
      },
    });

    expect(firstPage.page.map((item) => item.id)).toEqual(itemIds.slice(0, 2));
    expect(secondPage.page.map((item) => item.id)).toEqual(itemIds.slice(2));
    expect(firstPage.isDone).toBe(false);
    expect(secondPage.isDone).toBe(true);
  });

  test("paginates unfiltered roadmap items across status streams", async () => {
    const testInstance = setup();
    for (const [index, status] of (
      [
        "planned",
        "in_progress",
        "shipped",
        "planned",
        "in_progress",
        "shipped",
      ] as const
    ).entries()) {
      await createRoadmapItem(testInstance, `Item ${index}`, status);
    }

    const firstPage = await testInstance.query(api.roadmap.list, {
      paginationOpts: { cursor: null, numItems: 2 },
    });
    const secondPage = await testInstance.query(api.roadmap.list, {
      paginationOpts: {
        cursor: firstPage.continueCursor,
        numItems: 10,
      },
    });
    const boundFirstPage = await testInstance.query(api.roadmap.list, {
      paginationOpts: {
        cursor: null,
        endCursor: firstPage.continueCursor,
        numItems: 2,
      },
    });

    expect(boundFirstPage.page).toEqual(firstPage.page);
    expect(secondPage.page).toHaveLength(4);
    expect(new Set([...firstPage.page, ...secondPage.page]).size).toBe(6);
    expect(secondPage.isDone).toBe(true);
  });

  test("rebalances a stage when neighboring positions become too close", async () => {
    const testInstance = setup();
    const firstId = await createRoadmapItem(testInstance, "First");
    const movingId = await createRoadmapItem(testInstance, "Moving");
    const secondId = await createRoadmapItem(testInstance, "Second");
    const thirdId = await createRoadmapItem(testInstance, "Third");

    await testInstance.run(async (ctx) => {
      await ctx.db.patch("roadmap", firstId, { position: 100 });
      await ctx.db.patch("roadmap", secondId, { position: 100.5 });
      await ctx.db.patch("roadmap", thirdId, { position: 200 });
    });

    const position = await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: movingId,
      status: "planned",
      previousItemId: firstId,
      nextItemId: secondId,
    });

    expect(position).toBe(100.25);

    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const ordered = await testInstance.query(api.roadmap.list, {
      paginationOpts: { cursor: null, numItems: 10 },
      status: "planned",
    });

    expect(ordered.page.map((item) => item.id)).toEqual([
      firstId,
      movingId,
      secondId,
      thirdId,
    ]);
    expect(ordered.page.map((item) => item.position)).toEqual([
      1_000_000, 2_000_000, 3_000_000, 4_000_000,
    ]);

    const stored = await testInstance.run((ctx) =>
      ctx.db
        .query("roadmap")
        .withIndex("by_status_and_position", (q) => q.eq("status", "planned"))
        .order("asc")
        .collect(),
    );
    expect(stored.map((item) => item.position)).toEqual([
      1_000_000, 2_000_000, 3_000_000, 4_000_000,
    ]);
  });

  test("rejects missing and self-referential neighbors", async () => {
    const testInstance = setup();
    const movingId = await createRoadmapItem(testInstance, "Moving");
    const deletedNeighborId = await createRoadmapItem(
      testInstance,
      "Deleted neighbor",
    );

    await testInstance.run((ctx) =>
      ctx.db.delete("roadmap", deletedNeighborId),
    );

    await expect(
      testInstance.mutation(api.roadmap.move, {
        actor,
        roadmapId: movingId,
        status: "planned",
        previousItemId: deletedNeighborId,
      }),
    ).rejects.toThrow("Previous roadmap item not found.");

    await expect(
      testInstance.mutation(api.roadmap.move, {
        actor,
        roadmapId: movingId,
        status: "planned",
        nextItemId: movingId,
      }),
    ).rejects.toThrow("Roadmap item cannot be its own neighbor.");
  });

  test("rebalances stages larger than one background batch", async () => {
    const testInstance = setup();
    const itemIds = await testInstance.run(async (ctx) => {
      const ids: Id<"roadmap">[] = [];
      for (let index = 0; index < 201; index += 1) {
        ids.push(
          await ctx.db.insert("roadmap", {
            title: `Item ${index}`,
            status: "planned",
            position: index === 0 ? 0 : index === 1 ? 5 : index * 10,
            feedbackCount: 0,
            createdAt: index,
            updatedAt: index,
          }),
        );
      }
      return ids;
    });

    const position = await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: itemIds[2]!,
      status: "planned",
      previousItemId: itemIds[0]!,
      nextItemId: itemIds[1]!,
    });
    expect(position).toBe(2.5);

    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const ordered = await testInstance.query(api.roadmap.list, {
      paginationOpts: { cursor: null, numItems: 250 },
      status: "planned",
    });
    expect(ordered.page).toHaveLength(201);
    expect(ordered.page.slice(0, 3).map((item) => item.id)).toEqual([
      itemIds[0],
      itemIds[2],
      itemIds[1],
    ]);
    expect(
      ordered.page.every(
        (item, index) => item.position === (index + 1) * 1_000_000,
      ),
    ).toBe(true);
  });

  test("keeps live reads stable until the replacement generation completes", async () => {
    const testInstance = setup();
    await testInstance.run(async (ctx) => {
      const ids: Id<"roadmap">[] = [];
      for (let index = 0; index < 150; index += 1) {
        ids.push(
          await ctx.db.insert("roadmap", {
            title: `Item ${index}`,
            status: "planned",
            position: index === 0 ? 0 : index === 1 ? 5 : index * 10,
            feedbackCount: 0,
            createdAt: index,
            updatedAt: index,
          }),
        );
      }
      await ctx.db.insert("roadmapRebalances", {
        status: "planned",
        nextGeneration: 1,
        activeGeneration: "1",
      });
      return ids;
    });

    const generation = "1";
    vi.useFakeTimers();
    try {
      const liveBefore = await testInstance.query(api.roadmap.list, {
        paginationOpts: { cursor: null, numItems: 250 },
        status: "planned",
      });
      const firstMarkPage = await testInstance.run((ctx) =>
        ctx.db
          .query("roadmap")
          .withIndex("by_status_deleting_at_position", (q) =>
            q.eq("status", "planned").eq("deletingAt", undefined),
          )
          .order("asc")
          .paginate({ cursor: null, numItems: 100, maximumRowsRead: 100 }),
      );
      expect(firstMarkPage.page).toHaveLength(100);

      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "mark",
        paginationOpts: {
          cursor: null,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: 0,
      });
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "mark",
        paginationOpts: {
          cursor: firstMarkPage.continueCursor,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: firstMarkPage.page.length,
      });
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "rewrite",
        paginationOpts: {
          cursor: null,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: 0,
      });

      const stateDuringRewrite = await testInstance.run((ctx) =>
        ctx.db
          .query("roadmapRebalances")
          .withIndex("by_status", (q) => q.eq("status", "planned"))
          .first(),
      );
      expect(stateDuringRewrite?.activeGeneration).toBe(generation);
      const liveDuringRewrite = await testInstance.query(api.roadmap.list, {
        paginationOpts: { cursor: null, numItems: 250 },
        status: "planned",
      });
      expect(liveDuringRewrite.page).toEqual(liveBefore.page);

      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
      const completed = await testInstance.query(api.roadmap.list, {
        paginationOpts: { cursor: null, numItems: 250 },
        status: "planned",
      });
      expect(completed.page).toHaveLength(150);
      expect(
        completed.page.every(
          (item, index) => item.position === (index + 1) * 1_000_000,
        ),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test("keeps unfiltered reads stable during batched promotion", async () => {
    const testInstance = setup();
    await testInstance.run(async (ctx) => {
      for (let index = 0; index < 150; index += 1) {
        await ctx.db.insert("roadmap", {
          title: `Item ${index}`,
          status: "planned",
          position: index === 0 ? 0 : index === 1 ? 5 : index * 10,
          feedbackCount: 0,
          createdAt: index,
          updatedAt: index,
        });
      }
      await ctx.db.insert("roadmapRebalances", {
        status: "planned",
        nextGeneration: 1,
        activeGeneration: "1",
      });
    });

    const generation = "1";
    vi.useFakeTimers();
    try {
      const firstMarkPage = await testInstance.run((ctx) =>
        ctx.db
          .query("roadmap")
          .withIndex("by_status_deleting_at_position", (q) =>
            q.eq("status", "planned").eq("deletingAt", undefined),
          )
          .order("asc")
          .paginate({ cursor: null, numItems: 100, maximumRowsRead: 100 }),
      );
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "mark",
        paginationOpts: {
          cursor: null,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: 0,
      });
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "mark",
        paginationOpts: {
          cursor: firstMarkPage.continueCursor,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: firstMarkPage.page.length,
      });

      const firstRewritePage = await testInstance.run((ctx) =>
        paginator(ctx.db, schema)
          .query("roadmap")
          .withIndex("by_status_rebalance_rank", (q) =>
            q.eq("status", "planned").eq("rebalanceId", generation),
          )
          .order("asc")
          .paginate({ cursor: null, numItems: 100, maximumRowsRead: 100 }),
      );
      expect(firstRewritePage.page).toHaveLength(100);
      expect(firstRewritePage.isDone).toBe(false);
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "rewrite",
        paginationOpts: {
          cursor: null,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: 0,
      });
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "rewrite",
        paginationOpts: {
          cursor: firstRewritePage.continueCursor,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: firstRewritePage.page.length,
      });

      const stateBeforePromotion = await testInstance.run((ctx) =>
        ctx.db
          .query("roadmapRebalances")
          .withIndex("by_status", (q) => q.eq("status", "planned"))
          .first(),
      );
      expect(stateBeforePromotion?.activeGeneration).toBe(generation);
      expect(stateBeforePromotion?.visibleGeneration).toBe(generation);
      const beforePromotion = await testInstance.query(api.roadmap.list, {
        paginationOpts: { cursor: null, numItems: 250 },
      });
      await testInstance.mutation(internal.roadmap.rebalanceBatch, {
        status: "planned",
        rebalanceId: generation,
        phase: "promote",
        paginationOpts: {
          cursor: null,
          numItems: 100,
          maximumRowsRead: 100,
        },
        offset: 0,
      });

      const duringPromotion = await testInstance.query(api.roadmap.list, {
        paginationOpts: { cursor: null, numItems: 250 },
      });
      expect(duringPromotion).toEqual(beforePromotion);
      expect(
        duringPromotion.page.every(
          (item, index) => item.position === (index + 1) * 1_000_000,
        ),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test("supersedes stale mark and rewrite generations per status", async () => {
    const testInstance = setup();
    const itemIds = await testInstance.run(async (ctx) => {
      const positions = [0, 5, 10, 15];
      const ids: Id<"roadmap">[] = [];
      for (const [index, position] of positions.entries()) {
        ids.push(
          await ctx.db.insert("roadmap", {
            title: `Item ${index}`,
            status: "planned",
            position,
            feedbackCount: 0,
            createdAt: index,
            updatedAt: index,
          }),
        );
      }
      return ids;
    });

    await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: itemIds[2]!,
      status: "planned",
      previousItemId: itemIds[0]!,
      nextItemId: itemIds[1]!,
    });
    const firstState = await testInstance.run((ctx) =>
      ctx.db
        .query("roadmapRebalances")
        .withIndex("by_status", (q) => q.eq("status", "planned"))
        .first(),
    );
    const firstGeneration = firstState?.activeGeneration;
    expect(firstGeneration).toEqual(expect.any(String));
    if (firstGeneration === undefined) {
      throw new Error("First rebalance was not scheduled");
    }

    await testInstance.mutation(internal.roadmap.rebalanceBatch, {
      status: "planned",
      rebalanceId: firstGeneration,
      phase: "mark",
      paginationOpts: { cursor: null, numItems: 10 },
      offset: 0,
    });

    await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: itemIds[3]!,
      status: "planned",
      previousItemId: itemIds[2]!,
      nextItemId: itemIds[1]!,
    });
    const secondState = await testInstance.run((ctx) =>
      ctx.db
        .query("roadmapRebalances")
        .withIndex("by_status", (q) => q.eq("status", "planned"))
        .first(),
    );
    const secondGeneration = secondState?.activeGeneration;
    expect(secondGeneration).toEqual(expect.any(String));
    expect(secondGeneration).not.toBe(firstGeneration);

    const liveBeforeStaleJobs = await testInstance.run((ctx) =>
      Promise.all(itemIds.map((itemId) => ctx.db.get("roadmap", itemId))),
    );
    await testInstance.mutation(internal.roadmap.rebalanceBatch, {
      status: "planned",
      rebalanceId: firstGeneration,
      phase: "mark",
      paginationOpts: { cursor: null, numItems: 10 },
      offset: 0,
    });
    await testInstance.mutation(internal.roadmap.rebalanceBatch, {
      status: "planned",
      rebalanceId: firstGeneration,
      phase: "rewrite",
      paginationOpts: { cursor: null, numItems: 10 },
      offset: 0,
    });
    const liveAfterStaleJobs = await testInstance.run((ctx) =>
      Promise.all(itemIds.map((itemId) => ctx.db.get("roadmap", itemId))),
    );
    expect(liveAfterStaleJobs).toEqual(liveBeforeStaleJobs);

    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const completed = await testInstance.query(api.roadmap.list, {
      paginationOpts: { cursor: null, numItems: 10 },
      status: "planned",
    });
    expect(completed.page.map((item) => item.id)).toEqual([
      itemIds[0],
      itemIds[2],
      itemIds[3],
      itemIds[1],
    ]);
    expect(completed.page.map((item) => item.position)).toEqual([
      1_000_000, 2_000_000, 3_000_000, 4_000_000,
    ]);
  });
});
