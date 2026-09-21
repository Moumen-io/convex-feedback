import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../src/component/_generated/api.js";
import type { Id } from "../src/component/_generated/dataModel.js";
import type { EntryStatus } from "../src/component/model.js";
import schema from "../src/component/schema.js";

const modules = import.meta.glob("../src/component/**/*.ts");
const actor = { id: "admin-1", isAdmin: true } as const;

function setup() {
  return convexTest(schema, modules);
}

async function createEntry(
  testInstance: ReturnType<typeof setup>,
  title: string,
  defaultStatus: EntryStatus = "open",
): Promise<Id<"entries">> {
  const result = await testInstance.mutation(api.entries.create, {
    actorId: "author-1",
    kind: "feature_request",
    title,
    body: "Common searchable needle for pagination coverage.",
    defaultStatus,
    enabledKinds: ["feedback", "feature_request", "bug_report"],
    maxTitleLength: 160,
    maxBodyLength: 10_000,
  });
  return result.id;
}

describe("admin filtering pagination", () => {
  test("distinguishes exact statuses, the open bucket, and no status filter", async () => {
    const testInstance = setup();
    const statuses: EntryStatus[] = [
      "open",
      "under_review",
      "planned",
      "in_progress",
      "completed",
      "closed",
    ];
    const entryIds = new Map<EntryStatus, Id<"entries">>();

    for (const status of statuses) {
      entryIds.set(
        status,
        await createEntry(testInstance, `status filter ${status}`, status),
      );
    }

    const list = (filters: { status?: EntryStatus; statusFilter?: "open" }) =>
      testInstance.query(api.admin.listEntries, {
        ...filters,
        paginationOpts: { cursor: null, numItems: 20 },
        viewerActorId: actor.id,
      });

    for (const status of statuses) {
      const exact = await list({ status });
      expect(exact.page.map((entry) => entry.id)).toEqual([
        entryIds.get(status),
      ]);
      expect(exact.page.every((entry) => entry.status === status)).toBe(true);
    }

    const allOpen = await list({ statusFilter: "open" });
    expect(allOpen.page).toHaveLength(statuses.length - 1);
    expect(allOpen.page.map((entry) => entry.status)).not.toContain("closed");
    expect(allOpen.page.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(
        statuses
          .filter((status) => status !== "closed")
          .map((status) => entryIds.get(status)),
      ),
    );

    const unfiltered = await list({});
    expect(unfiltered.page).toHaveLength(statuses.length);
    expect(unfiltered.page.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...entryIds.values()]),
    );
  });

  test("rejects combining exact status and statusFilter", async () => {
    const testInstance = setup();

    await expect(
      testInstance.query(api.admin.listEntries, {
        status: "open",
        statusFilter: "open",
        paginationOpts: { cursor: null, numItems: 20 },
        viewerActorId: actor.id,
      }),
    ).rejects.toThrow("cannot be used together");

    await expect(
      testInstance.query(api.admin.searchEntries, {
        searchQuery: "status",
        status: "open",
        statusFilter: "open",
        paginationOpts: { cursor: null, numItems: 20 },
        viewerActorId: actor.id,
      }),
    ).rejects.toThrow("cannot be used together");
  });

  test("admin search preserves exact, bucket, and cleared status filters", async () => {
    const testInstance = setup();
    const statuses: EntryStatus[] = [
      "open",
      "under_review",
      "planned",
      "in_progress",
      "completed",
      "closed",
    ];
    const entryIds = new Map<EntryStatus, Id<"entries">>();

    for (const status of statuses) {
      entryIds.set(
        status,
        await createEntry(testInstance, `search status ${status}`, status),
      );
    }

    const search = (filters: { status?: EntryStatus; statusFilter?: "open" }) =>
      testInstance.query(api.admin.searchEntries, {
        ...filters,
        searchQuery: "search status",
        paginationOpts: { cursor: null, numItems: 20 },
        viewerActorId: actor.id,
      });

    const exact = await search({ status: "under_review" });
    expect(exact.page.map((entry) => entry.id)).toEqual([
      entryIds.get("under_review"),
    ]);
    expect(exact.page.every((entry) => entry.status === "under_review")).toBe(
      true,
    );

    const allOpen = await search({ statusFilter: "open" });
    expect(allOpen.page).toHaveLength(statuses.length - 1);
    expect(allOpen.page.map((entry) => entry.status)).not.toContain("closed");
    expect(allOpen.page.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(
        statuses
          .filter((status) => status !== "closed")
          .map((status) => entryIds.get(status)),
      ),
    );

    const unfiltered = await search({});
    expect(unfiltered.page).toHaveLength(statuses.length);
    expect(unfiltered.page.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...entryIds.values()]),
    );
  });

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
