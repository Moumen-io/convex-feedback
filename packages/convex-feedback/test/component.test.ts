import { convexTest } from "convex-test";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { describe, expect, expectTypeOf, test } from "vitest";

import { api } from "../src/component/_generated/api.js";
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

  test("entry metadata is returned only by moderator get queries", async () => {
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
    const moderator = await testInstance.query(api.entries.get, {
      entryId,
      viewerActorId: "moderator-1",
      viewerIsModerator: true,
    });
    const list = await testInstance.query(api.entries.list, {
      paginationOpts: { numItems: 10, cursor: null },
      sort: "newest",
      viewerActorId: "moderator-1",
    });

    expect(anonymous).not.toHaveProperty("metadata");
    expect(member).not.toHaveProperty("metadata");
    expect(moderator?.metadata).toEqual(metadata);
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
