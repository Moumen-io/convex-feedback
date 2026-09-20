import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../src/component/_generated/api.js";
import type { Id } from "../src/component/_generated/dataModel.js";
import schema from "../src/component/schema.js";

const modules = import.meta.glob("../src/component/**/*.ts");
const actor = { id: "admin-1", isAdmin: true } as const;

function setup() {
  return convexTest(schema, modules);
}

async function createEntry(
  testInstance: ReturnType<typeof setup>,
  title: string,
): Promise<Id<"entries">> {
  const result = await testInstance.mutation(api.entries.create, {
    actorId: "author-1",
    kind: "feature_request",
    title,
    body: "Common searchable needle for pagination coverage.",
    defaultStatus: "open",
    enabledKinds: ["feedback", "feature_request", "bug_report"],
    maxTitleLength: 160,
    maxBodyLength: 10_000,
  });
  return result.id;
}

describe("admin filtering pagination", () => {
  test("multi-kind admin search pre-filters before pagination", async () => {
    const testInstance = setup();
    const targetId = await createEntry(testInstance, "Multi kind target");
    for (let index = 0; index < 20; index += 1) {
      await testInstance.mutation(api.entries.create, {
        actorId: "author-2",
        kind: "feedback",
        title: "Multi kind decoy " + index,
        body: "Common searchable needle for pagination coverage.",
        defaultStatus: "open",
        enabledKinds: ["feedback", "feature_request", "bug_report"],
        maxTitleLength: 160,
        maxBodyLength: 10_000,
      });
    }

    const result = await testInstance.query(api.admin.searchEntries, {
      searchQuery: "multi kind target",
      kinds: ["feature_request", "bug_report"],
      paginationOpts: { cursor: null, numItems: 1 },
      viewerActorId: actor.id,
    });
    expect(result.page.map((entry) => entry.id)).toEqual([targetId]);
  });

  test("single-kind admin search preserves search-index pagination", async () => {
    const testInstance = setup();
    const firstId = await createEntry(testInstance, "Single kind first");
    const secondId = await createEntry(testInstance, "Single kind second");

    const firstPage = await testInstance.query(api.admin.searchEntries, {
      searchQuery: "common searchable needle",
      kinds: ["feature_request"],
      paginationOpts: { cursor: null, numItems: 1 },
      viewerActorId: actor.id,
    });
    const secondPage = await testInstance.query(api.admin.searchEntries, {
      searchQuery: "common searchable needle",
      kinds: ["feature_request"],
      paginationOpts: {
        cursor: firstPage.continueCursor,
        numItems: 1,
      },
      viewerActorId: actor.id,
    });

    const pageIds = [...firstPage.page, ...secondPage.page].map(
      (entry) => entry.id,
    );
    expect(pageIds).toHaveLength(2);
    expect(pageIds).toEqual(expect.arrayContaining([firstId, secondId]));
    expect(firstPage.isDone).toBe(false);
    expect(secondPage.isDone).toBe(true);
  });
});
