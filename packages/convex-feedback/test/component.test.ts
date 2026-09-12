import { convexTest } from "convex-test";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { api, internal } from "../src/component/_generated/api.js";
import type { Id } from "../src/component/_generated/dataModel.js";
import schema from "../src/component/schema.js";

const modules = import.meta.glob("../src/component/**/*.ts");

function setup() {
  return convexTest(schema, modules);
}

async function createEntry(
  testInstance: ReturnType<typeof setup>,
  title = "Dark mode",
): Promise<Id<"entries">> {
  return await testInstance.mutation(api.entries.create, {
    actorId: "author-1",
    kind: "feature_request",
    title,
    body: "Please add this feature.",
    defaultStatus: "open",
    enabledKinds: ["feedback", "feature_request", "bug_report"],
    maxTitleLength: 160,
    maxBodyLength: 10_000,
  });
}

describe("convex-feedback component", () => {
  test("component functions preserve generated document ID types", () => {
    expectTypeOf<FunctionReturnType<typeof api.entries.create>>().toEqualTypeOf<
      Id<"entries">
    >();
    expectTypeOf<
      FunctionReturnType<typeof api.comments.create>
    >().toEqualTypeOf<Id<"comments">>();

    expectTypeOf<
      FunctionArgs<typeof api.entries.get>["entryId"]
    >().toEqualTypeOf<Id<"entries">>();
    expectTypeOf<
      FunctionArgs<typeof api.entries.update>["entryId"]
    >().toEqualTypeOf<Id<"entries">>();
    expectTypeOf<
      FunctionArgs<typeof api.entries.setStatus>["entryId"]
    >().toEqualTypeOf<Id<"entries">>();
    expectTypeOf<
      FunctionArgs<typeof api.entries.setUpvote>["entryId"]
    >().toEqualTypeOf<Id<"entries">>();

    expectTypeOf<
      FunctionArgs<typeof api.comments.list>["entryId"]
    >().toEqualTypeOf<Id<"entries">>();
    expectTypeOf<
      FunctionArgs<typeof api.comments.list>["parentCommentId"]
    >().toEqualTypeOf<Id<"comments"> | undefined>();
    expectTypeOf<
      FunctionArgs<typeof api.comments.create>["entryId"]
    >().toEqualTypeOf<Id<"entries">>();
    expectTypeOf<
      FunctionArgs<typeof api.comments.create>["parentCommentId"]
    >().toEqualTypeOf<Id<"comments"> | undefined>();
    expectTypeOf<
      FunctionArgs<typeof api.comments.update>["commentId"]
    >().toEqualTypeOf<Id<"comments">>();
    expectTypeOf<
      FunctionArgs<typeof api.comments.remove>["commentId"]
    >().toEqualTypeOf<Id<"comments">>();
    expectTypeOf<
      FunctionArgs<typeof api.comments.setLike>["commentId"]
    >().toEqualTypeOf<Id<"comments">>();
  });

  test("document ID validators reject malformed entry IDs", async () => {
    const testInstance = setup();

    await expect(
      testInstance.query(api.entries.get, {
        entryId: "not-an-id" as Id<"entries">,
      }),
    ).rejects.toThrow();
  });

  test("new entries are automatically upvoted by their creator", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance);

    const entry = await testInstance.query(api.entries.get, {
      entryId,
      viewerActorId: "author-1",
    });

    expect(entry?.upvoteCount).toBe(1);
    expect(entry?.viewerHasUpvoted).toBe(true);
  });

  test("admin priority and arbitrary tags stay private and deletion cascades", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Admin triage target");
    const actor = { id: "admin-1", isAdmin: true } as const;
    const revenueTagId = await testInstance.mutation(api.tags.create, {
      actor,
      name: "Revenue",
      color: "#8b5cf6",
    });
    const mobileTagId = await testInstance.mutation(api.tags.create, {
      actor,
      name: "Mobile",
    });
    const retentionTagId = await testInstance.mutation(api.tags.create, {
      actor,
      name: "Retention",
    });

    await testInstance.mutation(api.entries.setPriority, {
      actor,
      entryId,
      priority: "high",
    });
    for (const tagId of [revenueTagId, mobileTagId, retentionTagId]) {
      await testInstance.mutation(api.tags.attach, { actor, entryId, tagId });
    }

    const publicEntry = await testInstance.query(api.entries.get, { entryId });
    expect(publicEntry).not.toHaveProperty("priority");
    expect(publicEntry).not.toHaveProperty("tags");

    const adminEntry = await testInstance.query(api.admin.getEntry, {
      entryId,
      viewerActorId: actor.id,
    });
    expect(adminEntry?.priority).toBe("high");
    expect(adminEntry?.tags.map((tag) => tag.name)).toEqual([
      "Revenue",
      "Mobile",
      "Retention",
    ]);

    const filtered = await testInstance.query(api.admin.listEntries, {
      tagId: retentionTagId,
      priority: "high",
      paginationOpts: { cursor: null, numItems: 10 },
      viewerActorId: actor.id,
    });
    expect(filtered.page.map((entry) => entry.id)).toEqual([entryId]);

    await testInstance.mutation(api.tags.detach, {
      actor,
      entryId,
      tagId: mobileTagId,
    });
    await testInstance.mutation(api.tags.remove, {
      actor,
      tagId: revenueTagId,
    });

    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const stored = await testInstance.run((ctx) =>
      ctx.db.get("entries", entryId),
    );
    expect(stored?.tagIds).toEqual([retentionTagId]);
  });

  test("roadmap uses fractional positions and deletion detaches feedback", async () => {
    const testInstance = setup();
    const actor = { id: "admin-1", isAdmin: true } as const;
    const entryId = await createEntry(testInstance, "Roadmap target");
    const firstId = await testInstance.mutation(api.roadmap.create, {
      actor,
      title: "First item",
      status: "planned",
    });
    const secondId = await testInstance.mutation(api.roadmap.create, {
      actor,
      title: "Second item",
      status: "planned",
    });
    const movedPosition = await testInstance.mutation(api.roadmap.move, {
      actor,
      roadmapId: secondId,
      status: "planned",
      nextItemId: firstId,
    });
    expect(movedPosition).toBe(0);

    await testInstance.mutation(api.roadmap.attachFeedback, {
      actor,
      roadmapId: firstId,
      entryId,
    });
    const attachedItem = await testInstance.run((ctx) =>
      ctx.db.get("roadmap", firstId),
    );
    expect(attachedItem?.feedbackCount).toBe(1);

    await testInstance.mutation(api.roadmap.remove, {
      actor,
      roadmapId: firstId,
    });
    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }
    const storedEntry = await testInstance.run((ctx) =>
      ctx.db.get("entries", entryId),
    );
    expect(storedEntry?.roadmapId).toBeUndefined();
  });

  test("hides roadmap items from list and search while deletion is pending", async () => {
    const testInstance = setup();
    const actor = { id: "admin-1", isAdmin: true } as const;
    const roadmapId = await testInstance.mutation(api.roadmap.create, {
      actor,
      title: "Pending deletion roadmap",
      status: "planned",
    });

    await testInstance.mutation(api.roadmap.remove, { actor, roadmapId });

    const [listed, searched] = await Promise.all([
      testInstance.query(api.roadmap.list, {
        paginationOpts: { cursor: null, numItems: 10 },
        status: "planned",
      }),
      testInstance.query(api.roadmap.search, {
        searchQuery: "pending deletion",
        limit: 10,
      }),
    ]);

    expect(listed.page.map((item) => item.id)).not.toContain(roadmapId);
    expect(searched.map((item) => item.id)).not.toContain(roadmapId);
  });

  test("tag and roadmap deletion self-schedule beyond 100 entries", async () => {
    const testInstance = setup();
    const actor = { id: "admin-1", isAdmin: true } as const;
    const tagId = await testInstance.mutation(api.tags.create, {
      actor,
      name: "Bulk cleanup",
    });
    const roadmapId = await testInstance.mutation(api.roadmap.create, {
      actor,
      title: "Bulk cleanup roadmap",
      status: "planned",
    });

    const entryIds = await testInstance.run(async (ctx) => {
      const ids: Id<"entries">[] = [];
      for (let index = 0; index < 101; index += 1) {
        ids.push(
          await ctx.db.insert("entries", {
            actorId: "bulk-author-" + index,
            kind: "feedback",
            status: "open",
            statusFilter: "open",
            title: "Bulk entry " + index,
            body: "Bulk cleanup body",
            normalizedTitle: "bulk entry " + index,
            searchText: "Bulk entry " + index + "\nBulk cleanup body",
            upvoteCount: 0,
            commentCount: 0,
            tagIds: [tagId],
            roadmapId,
          }),
        );
      }
      await ctx.db.patch("roadmap", roadmapId, { feedbackCount: ids.length });
      return ids;
    });

    await testInstance.mutation(api.tags.remove, { actor, tagId });
    await testInstance.mutation(api.roadmap.remove, { actor, roadmapId });

    const pending = await testInstance.run(async (ctx) => ({
      tag: await ctx.db.get("tags", tagId),
      roadmap: await ctx.db.get("roadmap", roadmapId),
    }));
    expect(pending.tag?.deletingAt).toEqual(expect.any(Number));
    expect(pending.roadmap?.deletingAt).toEqual(expect.any(Number));

    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const cleaned = await testInstance.run(async (ctx) => ({
      tag: await ctx.db.get("tags", tagId),
      roadmap: await ctx.db.get("roadmap", roadmapId),
      entries: await Promise.all(
        entryIds.map((entryId) => ctx.db.get("entries", entryId)),
      ),
    }));
    expect(cleaned.tag).toBeNull();
    expect(cleaned.roadmap).toBeNull();
    expect(
      cleaned.entries.every(
        (entry) =>
          entry !== null &&
          !entry.tagIds?.includes(tagId) &&
          entry.roadmapId === undefined,
      ),
    ).toBe(true);
  });

  test("admin inbox and roadmap lists use cursor pagination", async () => {
    const testInstance = setup();
    const actor = { id: "admin-1", isAdmin: true } as const;
    for (const title of [
      "Paged feedback one",
      "Paged feedback two",
      "Paged feedback three",
    ]) {
      await createEntry(testInstance, title);
    }

    const firstEntries = await testInstance.query(api.admin.listEntries, {
      paginationOpts: { cursor: null, numItems: 2 },
      viewerActorId: actor.id,
    });
    const remainingEntries = await testInstance.query(api.admin.listEntries, {
      paginationOpts: { cursor: firstEntries.continueCursor, numItems: 2 },
      viewerActorId: actor.id,
    });
    expect(firstEntries.page).toHaveLength(2);
    expect(remainingEntries.page).toHaveLength(1);
    expect(remainingEntries.isDone).toBe(true);

    for (const title of ["Roadmap one", "Roadmap two", "Roadmap three"]) {
      await testInstance.mutation(api.roadmap.create, {
        actor,
        title,
        status: "planned",
      });
    }
    const firstRoadmap = await testInstance.query(api.roadmap.list, {
      paginationOpts: { cursor: null, numItems: 2 },
      status: "planned",
    });
    const remainingRoadmap = await testInstance.query(api.roadmap.list, {
      paginationOpts: { cursor: firstRoadmap.continueCursor, numItems: 2 },
      status: "planned",
    });
    expect(firstRoadmap.page).toHaveLength(2);
    expect(remainingRoadmap.page).toHaveLength(1);
    expect(remainingRoadmap.isDone).toBe(true);
  });

  test("open and closed status filters are materialized and queried on Convex", async () => {
    const testInstance = setup();
    const openId = await createEntry(testInstance, "Open filter target");
    const plannedId = await createEntry(testInstance, "Planned filter target");
    const closedId = await createEntry(testInstance, "Closed filter target");

    await testInstance.mutation(api.entries.setStatus, {
      actor: { id: "admin-1", isAdmin: true },
      entryId: plannedId,
      status: "planned",
    });
    await testInstance.mutation(api.entries.setStatus, {
      actor: { id: "admin-1", isAdmin: true },
      entryId: closedId,
      status: "closed",
    });

    const storedFilters = await testInstance.run(async (ctx) => ({
      open: (await ctx.db.get("entries", openId))?.statusFilter,
      planned: (await ctx.db.get("entries", plannedId))?.statusFilter,
      closed: (await ctx.db.get("entries", closedId))?.statusFilter,
    }));
    expect(storedFilters).toEqual({
      open: "open",
      planned: "open",
      closed: "closed",
    });

    const openEntries = await testInstance.query(api.entries.list, {
      paginationOpts: { numItems: 10, cursor: null },
      statusFilter: "open",
      sort: "newest",
    });
    expect(openEntries.page.map((entry) => entry.id).sort()).toEqual(
      [openId, plannedId].sort(),
    );

    const closedSearch = await testInstance.query(api.entries.search, {
      searchQuery: "filter target",
      statusFilter: "closed",
      limit: 10,
    });
    expect(closedSearch.map((entry) => entry.id)).toEqual([closedId]);
  });

  test("status-filter migration backfills batches and is safe to rerun", async () => {
    const testInstance = setup();

    await testInstance.run(async (ctx) => {
      for (let index = 0; index < 101; index += 1) {
        const status = index % 2 === 0 ? "closed" : "planned";
        await ctx.db.insert("entries", {
          actorId: `legacy-author-${index}`,
          kind: "feedback",
          status,
          title: `Legacy entry ${index}`,
          body: "Legacy body",
          normalizedTitle: `legacy entry ${index}`,
          searchText: `Legacy entry ${index}\nLegacy body`,
          upvoteCount: 0,
          commentCount: 0,
        });
      }
    });

    const firstBatch = await testInstance.mutation(
      internal.migrations.backfillStatusFilter,
      {},
    );
    expect(firstBatch).toEqual({ updated: 100, hasMore: true });

    vi.useFakeTimers();
    try {
      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const entries = await testInstance.run(async (ctx) =>
      ctx.db.query("entries").take(200),
    );
    expect(entries).toHaveLength(101);
    expect(
      entries.every(
        (entry) =>
          entry.statusFilter ===
          (entry.status === "closed" ? "closed" : "open"),
      ),
    ).toBe(true);

    await expect(
      testInstance.mutation(internal.migrations.backfillStatusFilter, {}),
    ).resolves.toEqual({ updated: 0, hasMore: false });
  });

  test("entry metadata is returned only by admin get queries", async () => {
    const testInstance = setup();
    const metadata = {
      standard: { platform: "web", screenWidth: 1440 },
      additional: { releaseChannel: "production", diagnosticsMode: true },
    };
    const entryId = await testInstance.mutation(api.entries.create, {
      actorId: "author-1",
      kind: "bug_report",
      title: "Unexpected error",
      body: "The page stopped responding.",
      defaultStatus: "open",
      enabledKinds: ["feedback", "feature_request", "bug_report"],
      maxTitleLength: 160,
      maxBodyLength: 10_000,
      metadata,
    });

    const anonymous = await testInstance.query(api.entries.get, { entryId });
    const member = await testInstance.query(api.entries.get, {
      entryId,
      viewerActorId: "member-1",
    });
    const admin = await testInstance.query(api.entries.get, {
      entryId,
      viewerActorId: "admin-1",
      viewerIsAdmin: true,
    });
    const list = await testInstance.query(api.entries.list, {
      paginationOpts: { numItems: 10, cursor: null },
      sort: "newest",
      viewerActorId: "admin-1",
    });

    expect(anonymous).not.toHaveProperty("metadata");
    expect(member).not.toHaveProperty("metadata");
    expect(admin?.metadata).toEqual(metadata);
    expect(list.page[0]).not.toHaveProperty("metadata");
  });

  test("entry metadata validation reports the offending key and value", async () => {
    const testInstance = setup();
    const baseArgs = {
      actorId: "author-1",
      kind: "feedback" as const,
      title: "Metadata validation",
      body: "Validate diagnostic fields.",
      defaultStatus: "open" as const,
      enabledKinds: ["feedback", "feature_request", "bug_report"] as const,
      maxTitleLength: 160,
      maxBodyLength: 10_000,
    };

    await expect(
      testInstance.mutation(api.entries.create, {
        ...baseArgs,
        enabledKinds: [...baseArgs.enabledKinds],
        metadata: { additional: { constructor: "reserved" } },
      }),
    ).rejects.toThrow("Metadata key 'constructor'");

    await expect(
      testInstance.mutation(api.entries.create, {
        ...baseArgs,
        enabledKinds: [...baseArgs.enabledKinds],
        metadata: { additional: { trace: "x".repeat(1_025) } },
      }),
    ).rejects.toThrow("additional.trace");
  });

  test("entry upvotes are idempotent and counted atomically", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance);

    await testInstance.mutation(api.entries.setUpvote, {
      actorId: "user-a",
      entryId,
      desiredState: true,
    });
    await testInstance.mutation(api.entries.setUpvote, {
      actorId: "user-a",
      entryId,
      desiredState: true,
    });
    await testInstance.mutation(api.entries.setUpvote, {
      actorId: "user-b",
      entryId,
      desiredState: true,
    });

    const entry = await testInstance.query(api.entries.get, {
      entryId,
      viewerActorId: "user-a",
    });
    expect(entry?.upvoteCount).toBe(3);
    expect(entry?.viewerHasUpvoted).toBe(true);

    await testInstance.mutation(api.entries.setUpvote, {
      actorId: "user-a",
      entryId,
      desiredState: false,
    });
    const updated = await testInstance.query(api.entries.get, { entryId });
    expect(updated?.upvoteCount).toBe(2);
  });

  test("comments load one direct-child level at a time", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance);
    const rootId = await testInstance.mutation(api.comments.create, {
      actorId: "author-1",
      entryId,
      body: "Root",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    const childId = await testInstance.mutation(api.comments.create, {
      actorId: "author-2",
      entryId,
      parentCommentId: rootId,
      body: "Child",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    await testInstance.mutation(api.comments.create, {
      actorId: "author-3",
      entryId,
      parentCommentId: childId,
      body: "Grandchild",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });

    const roots = await testInstance.query(api.comments.list, {
      entryId,
      sort: "top",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(roots.page.map((comment) => comment.body)).toEqual(["Root"]);
    expect(roots.page[0]?.replyCount).toBe(1);

    const children = await testInstance.query(api.comments.list, {
      entryId,
      parentCommentId: rootId,
      sort: "top",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(children.page.map((comment) => comment.body)).toEqual(["Child"]);
    expect(children.page[0]?.replyCount).toBe(1);
  });

  test("maximum comment depth is enforced on writes", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance);
    const rootId = await testInstance.mutation(api.comments.create, {
      actorId: "author-1",
      entryId,
      body: "Root",
      maxDepth: 1,
      maxCommentLength: 5_000,
    });
    const childId = await testInstance.mutation(api.comments.create, {
      actorId: "author-2",
      entryId,
      parentCommentId: rootId,
      body: "Child",
      maxDepth: 1,
      maxCommentLength: 5_000,
    });

    await expect(
      testInstance.mutation(api.comments.create, {
        actorId: "author-3",
        entryId,
        parentCommentId: childId,
        body: "Too deep",
        maxDepth: 1,
        maxCommentLength: 5_000,
      }),
    ).rejects.toThrow();
  });

  test("top comments are ordered by likes and comment likes are idempotent", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance);
    const firstId = await testInstance.mutation(api.comments.create, {
      actorId: "author-1",
      entryId,
      body: "First",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    const secondId = await testInstance.mutation(api.comments.create, {
      actorId: "author-2",
      entryId,
      body: "Second",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });

    await testInstance.mutation(api.comments.setLike, {
      actorId: "user-a",
      commentId: firstId,
      desiredState: true,
    });
    await testInstance.mutation(api.comments.setLike, {
      actorId: "user-a",
      commentId: firstId,
      desiredState: true,
    });
    await testInstance.mutation(api.comments.setLike, {
      actorId: "user-a",
      commentId: secondId,
      desiredState: true,
    });
    await testInstance.mutation(api.comments.setLike, {
      actorId: "user-b",
      commentId: secondId,
      desiredState: true,
    });

    const page = await testInstance.query(api.comments.list, {
      entryId,
      sort: "top",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(
      page.page.map((comment) => [comment.body, comment.likeCount]),
    ).toEqual([
      ["Second", 2],
      ["First", 1],
    ]);
  });

  test("normalized-title lookup reports exact duplicates", async () => {
    const testInstance = setup();
    await createEntry(testInstance, "  Better   search  ");

    const result = await testInstance.query(api.entries.similar, {
      title: "better search",
      body: "Different explanation",
      kind: "feature_request",
      limit: 5,
    });
    expect(result.exact).toHaveLength(1);
    expect(result.exact[0]?.title).toBe("Better   search");
  });
});
