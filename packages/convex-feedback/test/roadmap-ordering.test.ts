import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../src/component/_generated/api.js";
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

    const ordered = await testInstance.run((ctx) =>
      ctx.db
        .query("roadmap")
        .withIndex("by_status_and_position", (q) => q.eq("status", "planned"))
        .order("asc")
        .collect(),
    );

    expect(position).toBe(1_500_000);
    expect(ordered.map((item) => item._id)).toEqual([
      firstId,
      movingId,
      secondId,
      thirdId,
    ]);
    expect(ordered.map((item) => item.position)).toEqual([
      1_000_000,
      1_500_000,
      2_000_000,
      4_000_000,
    ]);
  });
});
