import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api, internal } from "../src/component/_generated/api.js";
import type { Id } from "../src/component/_generated/dataModel.js";
import schema from "../src/component/schema.js";

const modules = import.meta.glob("../src/component/**/*.ts");
const admin = { id: "admin-1", isAdmin: true } as const;

function setup() {
  return convexTest(schema, modules);
}

async function createEntry(
  testInstance: ReturnType<typeof setup>,
  title = "Delete target",
): Promise<Id<"entries">> {
  const result = await testInstance.mutation(api.entries.create, {
    actorId: "author-1",
    kind: "feature_request",
    title,
    body: "Entry body",
    defaultStatus: "open",
    enabledKinds: ["feedback", "feature_request", "bug_report"],
    maxTitleLength: 160,
    maxBodyLength: 10_000,
  });
  return result.id;
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

describe("permanent entry deletion", () => {
  test("marks an entry before cleanup and is idempotent with no dependents", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Immediate deletion");
    await testInstance.run(async (ctx) => {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_entry_actor", (q) => q.eq("entryId", entryId))
        .take(10);
      for (const reaction of reactions) {
        await ctx.db.delete("reactions", reaction._id);
      }
    });

    await testInstance.mutation(api.entries.remove, { actor: admin, entryId });
    await testInstance.mutation(api.entries.remove, { actor: admin, entryId });
    await testInstance.mutation(internal.entries.removeBatch, { entryId });
    await testInstance.mutation(internal.entries.removeBatch, { entryId });

    const storedWhilePending = await testInstance.run((ctx) =>
      ctx.db.get("entries", entryId),
    );
    expect(storedWhilePending?.deletingAt).toEqual(expect.any(Number));
    await expect(
      testInstance.query(api.entries.get, { entryId }),
    ).resolves.toBeNull();
    await expect(
      testInstance.query(api.entries.list, {
        paginationOpts: { cursor: null, numItems: 10 },
        sort: "newest",
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.admin.getEntry, {
        entryId,
        viewerActorId: admin.id,
      }),
    ).resolves.toBeNull();

    await finishScheduled(testInstance);
    await expect(
      testInstance.run((ctx) => ctx.db.get("entries", entryId)),
    ).resolves.toBeNull();

    // A retry after finalization remains a no-op.
    await testInstance.mutation(api.entries.remove, { actor: admin, entryId });
  });

  test("drains direct reactions, nested comments, and comment reactions across batches", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Nested cleanup");
    const directActors = Array.from(
      { length: 101 },
      (_, index) => `upvoter-${index}`,
    );
    for (const actorId of directActors) {
      await testInstance.mutation(api.entries.setUpvote, {
        actorId,
        entryId,
        desiredState: true,
      });
    }

    const parent = await testInstance.mutation(api.comments.create, {
      actorId: "comment-author",
      entryId,
      body: "Parent",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    const reply = await testInstance.mutation(api.comments.create, {
      actorId: "reply-author",
      entryId,
      parentCommentId: parent.id,
      body: "Reply",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    const second = await testInstance.mutation(api.comments.create, {
      actorId: "second-author",
      entryId,
      body: "Second comment",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    const commentLikeActors = Array.from(
      { length: 101 },
      (_, index) => `comment-liker-${index}`,
    );
    for (const actorId of commentLikeActors) {
      await testInstance.mutation(api.comments.setLike, {
        actorId,
        commentId: second.id,
        desiredState: true,
      });
    }
    await testInstance.mutation(api.comments.setLike, {
      actorId: "reply-liker",
      commentId: reply.id,
      desiredState: true,
    });

    await testInstance.mutation(api.entries.remove, { actor: admin, entryId });
    await expect(
      testInstance.mutation(api.comments.create, {
        actorId: "late-commenter",
        entryId,
        body: "Late comment",
        maxDepth: 5,
        maxCommentLength: 5_000,
      }),
    ).rejects.toThrow("Entry is being deleted.");
    await expect(
      testInstance.mutation(api.entries.setUpvote, {
        actorId: "late-voter",
        entryId,
        desiredState: true,
      }),
    ).rejects.toThrow("Entry is being deleted.");
    await expect(
      testInstance.mutation(api.comments.setLike, {
        actorId: "late-liker",
        commentId: second.id,
        desiredState: true,
      }),
    ).rejects.toThrow("Entry is being deleted.");
    await expect(
      testInstance.mutation(api.comments.create, {
        actorId: "late-replier",
        entryId,
        parentCommentId: parent.id,
        body: "Late reply",
        maxDepth: 5,
        maxCommentLength: 5_000,
      }),
    ).rejects.toThrow("Entry is being deleted.");

    await finishScheduled(testInstance);

    const remaining = await testInstance.run(async (ctx) => ({
      entry: await ctx.db.get("entries", entryId),
      comments: await ctx.db
        .query("comments")
        .withIndex("by_entry_parent", (q) => q.eq("entryId", entryId))
        .take(1),
      directReactions: await ctx.db
        .query("reactions")
        .withIndex("by_entry_actor", (q) => q.eq("entryId", entryId))
        .take(1),
      parentReactions: await ctx.db
        .query("reactions")
        .withIndex("by_comment_actor", (q) => q.eq("commentId", parent.id))
        .take(1),
      replyReactions: await ctx.db
        .query("reactions")
        .withIndex("by_comment_actor", (q) => q.eq("commentId", reply.id))
        .take(1),
      secondReactions: await ctx.db
        .query("reactions")
        .withIndex("by_comment_actor", (q) => q.eq("commentId", second.id))
        .take(1),
    }));
    expect(remaining).toEqual({
      entry: null,
      comments: [],
      directReactions: [],
      parentReactions: [],
      replyReactions: [],
      secondReactions: [],
    });
    await expect(
      testInstance.query(api.reactions.listByActor, {
        actorId: "reply-liker",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.comments.listByActor, {
        actorId: "comment-author",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
  });

  test("hides pending entries from search, activity, and roadmap feedback and blocks reattachment", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Hidden deletion target");
    const roadmapId = await testInstance.mutation(api.roadmap.create, {
      actor: admin,
      title: "Deletion roadmap",
      status: "planned",
    });
    await testInstance.mutation(api.roadmap.attachFeedback, {
      actor: admin,
      roadmapId,
      entryId,
    });

    await testInstance.mutation(api.entries.remove, { actor: admin, entryId });
    const rawPending = await testInstance.run((ctx) =>
      ctx.db.get("entries", entryId),
    );
    expect(rawPending?.roadmapId).toBeUndefined();
    await expect(
      testInstance.query(api.entries.search, {
        searchQuery: "hidden deletion",
        limit: 10,
      }),
    ).resolves.toEqual([]);
    await expect(
      testInstance.query(api.entries.similar, {
        title: "Hidden deletion target",
        body: "Entry body",
        limit: 10,
      }),
    ).resolves.toEqual({ exact: [], similar: [] });
    await expect(
      testInstance.query(api.entries.listByActor, {
        actorId: "author-1",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.admin.listEntries, {
        viewerActorId: admin.id,
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.admin.searchEntries, {
        viewerActorId: admin.id,
        searchQuery: "hidden deletion",
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.comments.list, {
        entryId,
        paginationOpts: { cursor: null, numItems: 10 },
        sort: "oldest",
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.query(api.roadmap.listFeedback, {
        roadmapId,
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [] });
    await expect(
      testInstance.mutation(api.roadmap.attachFeedback, {
        actor: admin,
        roadmapId,
        entryId,
      }),
    ).rejects.toThrow("Entry is being deleted.");

    const roadmap = await testInstance.run((ctx) =>
      ctx.db.get("roadmap", roadmapId),
    );
    expect(roadmap?.feedbackCount).toBe(0);
    await finishScheduled(testInstance);
  });

  test("soft-deleting a comment keeps its replies and reactions", async () => {
    const testInstance = setup();
    const entryId = await createEntry(testInstance, "Soft comment deletion");
    const parent = await testInstance.mutation(api.comments.create, {
      actorId: "comment-author",
      entryId,
      body: "Parent",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    const reply = await testInstance.mutation(api.comments.create, {
      actorId: "reply-author",
      entryId,
      parentCommentId: parent.id,
      body: "Reply",
      maxDepth: 5,
      maxCommentLength: 5_000,
    });
    await testInstance.mutation(api.comments.setLike, {
      actorId: "liker",
      commentId: parent.id,
      desiredState: true,
    });
    await testInstance.mutation(api.comments.remove, {
      actor: { id: "comment-author" },
      commentId: parent.id,
      deletableByAuthor: true,
    });

    const stored = await testInstance.run(async (ctx) => ({
      parent: await ctx.db.get("comments", parent.id),
      reply: await ctx.db.get("comments", reply.id),
      reactions: await ctx.db
        .query("reactions")
        .withIndex("by_comment_actor", (q) => q.eq("commentId", parent.id))
        .take(10),
    }));
    expect(stored.parent?.deletedAt).toEqual(expect.any(Number));
    expect(stored.parent?.likeCount).toBe(1);
    expect(stored.reply?._id).toBe(reply.id);
    expect(stored.reactions).toHaveLength(1);

    await expect(
      testInstance.query(api.comments.list, {
        entryId,
        paginationOpts: { cursor: null, numItems: 10 },
        sort: "oldest",
      }),
    ).resolves.toMatchObject({ page: [{ id: parent.id, body: null }] });
    await expect(
      testInstance.query(api.comments.list, {
        entryId,
        parentCommentId: parent.id,
        paginationOpts: { cursor: null, numItems: 10 },
        sort: "oldest",
      }),
    ).resolves.toMatchObject({ page: [{ id: reply.id, body: "Reply" }] });
  });
});
