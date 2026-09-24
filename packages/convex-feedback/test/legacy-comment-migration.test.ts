import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api, internal } from "../src/component/_generated/api.js";
import type { Id } from "../src/component/_generated/dataModel.js";
import schema from "../src/component/schema.js";

const modules = import.meta.glob("../src/component/**/*.ts");

function setup() {
  return convexTest(schema, modules);
}

async function finishScheduled(
  testInstance: ReturnType<typeof setup>,
): Promise<void> {
  vi.useFakeTimers();
  try {
    await testInstance.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
}

async function createEntry(
  testInstance: ReturnType<typeof setup>,
  title = "Migration target",
): Promise<Id<"entries">> {
  const result = await testInstance.mutation(api.entries.create, {
    actorId: "migration-author",
    kind: "feature_request",
    title,
    body: "Migration body",
    defaultStatus: "open",
    enabledKinds: ["feedback", "feature_request", "bug_report"],
    maxTitleLength: 160,
    maxBodyLength: 10_000,
  });
  await testInstance.run(async (ctx) => {
    const creatorReaction = await ctx.db
      .query("reactions")
      .withIndex("by_entry_actor", (q) =>
        q.eq("entryId", result.id).eq("actorId", "migration-author"),
      )
      .unique();
    if (creatorReaction !== null) {
      await ctx.db.delete("reactions", creatorReaction._id);
    }
  });
  return result.id;
}

async function insertComment(
  testInstance: ReturnType<typeof setup>,
  entryId: Id<"entries">,
  actorId: string,
  depth = 0,
  parentCommentId?: Id<"comments">,
  deletedAt?: number,
): Promise<Id<"comments">> {
  return testInstance.run((ctx) =>
    ctx.db.insert("comments", {
      entryId,
      ...(parentCommentId === undefined ? {} : { parentCommentId }),
      actorId,
      depth,
      body: `${actorId} body`,
      likeCount: 0,
      replyCount: 0,
      ...(deletedAt === undefined ? {} : { deletedAt }),
    }),
  );
}

describe("legacy comment deletion migration", () => {
  test("removes legacy tombstones, descendants, reactions, and activity records", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance);
    const survivingParent = await insertComment(
      testInstance,
      entryId,
      "surviving-parent",
    );
    const root = await insertComment(
      testInstance,
      entryId,
      "legacy-root",
      1,
      survivingParent,
      Date.now() - 10_000,
    );
    const reply = await insertComment(
      testInstance,
      entryId,
      "legacy-reply",
      2,
      root,
      Date.now() - 9_000,
    );
    const nestedReply = await insertComment(
      testInstance,
      entryId,
      "legacy-nested-reply",
      3,
      reply,
    );
    await testInstance.run(async (ctx) => {
      await ctx.db.insert("reactions", {
        actorId: "root-liker",
        commentId: root,
      });
      await ctx.db.insert("reactions", {
        actorId: "reply-liker",
        commentId: reply,
      });
      await ctx.db.insert("reactions", {
        actorId: "nested-liker",
        commentId: nestedReply,
      });
      await ctx.db.patch("entries", entryId, { commentCount: 4 });
      await ctx.db.patch("comments", survivingParent, { replyCount: 1 });
      await ctx.db.patch("comments", root, { replyCount: 1 });
      await ctx.db.patch("comments", reply, { replyCount: 1 });
    });

    await expect(
      testInstance.query(api.comments.list, {
        entryId,
        parentCommentId: survivingParent,
        sort: "top",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.mutation(api.comments.setLike, {
        actorId: "late-liker",
        commentId: root,
        desiredState: true,
      }),
    ).rejects.toThrow("Comment is being deleted.");
    await expect(
      testInstance.mutation(api.comments.create, {
        actorId: "late-replier",
        entryId,
        parentCommentId: root,
        body: "Late reply",
        maxDepth: 10,
        maxCommentLength: 5_000,
      }),
    ).rejects.toThrow("Comment is being deleted.");

    await expect(
      testInstance.mutation(internal.migrations.cleanupLegacyComments, {}),
    ).resolves.toMatchObject({ phase: "tombstones", hasMore: true });
    // A retry before scheduled workers run must remain safe.
    await testInstance.mutation(internal.migrations.cleanupLegacyComments, {});
    await finishScheduled(testInstance);

    const remaining = await testInstance.run(async (ctx) => ({
      entry: await ctx.db.get("entries", entryId),
      comments: await ctx.db
        .query("comments")
        .withIndex("by_entry_parent", (q) => q.eq("entryId", entryId))
        .take(10),
      reactions: await ctx.db.query("reactions").take(20),
    }));
    expect(remaining.entry?.commentCount).toBe(1);
    expect(remaining.comments).toHaveLength(1);
    expect(remaining.comments[0]?._id).toBe(survivingParent);
    expect(remaining.comments[0]?.replyCount).toBe(0);
    expect(remaining.reactions).toEqual([]);
    await expect(
      testInstance.query(api.comments.listByActor, {
        actorId: "legacy-root",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.reactions.listByActor, {
        actorId: "root-liker",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
  });

  test("cleans orphan comments and reactions while preserving surviving counters", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Orphan comments");
    const missingParent = await insertComment(
      testInstance,
      entryId,
      "deleted-parent",
    );
    const orphanChild = await insertComment(
      testInstance,
      entryId,
      "orphan-child",
      1,
      missingParent,
    );
    const deletedEntry = await createEntry(testInstance, "Deleted entry");
    const entryOrphan = await insertComment(
      testInstance,
      deletedEntry,
      "deleted-entry-comment",
    );

    await testInstance.run(async (ctx) => {
      await ctx.db.delete("comments", missingParent);
      await ctx.db.insert("reactions", {
        actorId: "orphan-child-liker",
        commentId: orphanChild,
      });
      await ctx.db.insert("reactions", {
        actorId: "missing-comment-liker",
        commentId: missingParent,
      });
      await ctx.db.insert("reactions", {
        actorId: "entry-orphan-liker",
        commentId: entryOrphan,
      });
      await ctx.db.insert("reactions", {
        actorId: "missing-entry-liker",
        entryId: deletedEntry,
      });
      await ctx.db.patch("entries", entryId, { commentCount: 1 });
      await ctx.db.delete("entries", deletedEntry);
    });

    await testInstance.mutation(internal.migrations.cleanupLegacyComments, {});
    await finishScheduled(testInstance);

    const remaining = await testInstance.run(async (ctx) => ({
      comments: await ctx.db.query("comments").take(20),
      reactions: await ctx.db.query("reactions").take(20),
      entry: await ctx.db.get("entries", entryId),
    }));
    expect(remaining.comments).toEqual([]);
    expect(remaining.reactions).toEqual([]);
    expect(remaining.entry?.commentCount).toBe(0);

    await expect(
      testInstance.mutation(internal.migrations.cleanupLegacyComments, {}),
    ).resolves.toEqual({
      phase: "reactions",
      processed: 0,
      hasMore: false,
    });
  });

  test("drains more than one tombstone batch and remains idempotent", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Large legacy thread");
    const comments = [] as Id<"comments">[];
    for (let index = 0; index < 30; index += 1) {
      comments.push(
        await insertComment(
          testInstance,
          entryId,
          `legacy-${index}`,
          0,
          undefined,
          Date.now() - index - 1,
        ),
      );
    }
    const missingComment = await insertComment(
      testInstance,
      entryId,
      "missing-comment-target",
    );
    await testInstance.run(async (ctx) => {
      for (const [index, commentId] of comments.entries()) {
        await ctx.db.insert("reactions", {
          actorId: `legacy-liker-${index}`,
          commentId,
        });
      }
      await ctx.db.delete("comments", missingComment);
      for (let index = 0; index < 101; index += 1) {
        await ctx.db.insert("reactions", {
          actorId: `missing-comment-liker-${index}`,
          commentId: missingComment,
        });
      }
      await ctx.db.patch("entries", entryId, { commentCount: comments.length });
    });

    const first = await testInstance.mutation(
      internal.migrations.cleanupLegacyComments,
      {},
    );
    expect(first).toEqual({
      phase: "tombstones",
      processed: 25,
      hasMore: true,
    });
    await finishScheduled(testInstance);
    await testInstance.mutation(internal.migrations.cleanupLegacyComments, {});
    await finishScheduled(testInstance);

    const remaining = await testInstance.run(async (ctx) => ({
      comments: await ctx.db.query("comments").take(100),
      reactions: await ctx.db.query("reactions").take(100),
      entry: await ctx.db.get("entries", entryId),
    }));
    expect(remaining.comments).toEqual([]);
    expect(remaining.reactions).toEqual([]);
    expect(remaining.entry?.commentCount).toBe(0);
  });
});
