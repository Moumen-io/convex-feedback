import type {
  DefaultFunctionArgs,
  FunctionReference,
  GenericMutationCtx,
  RegisteredMutation,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  exposeFeedbackApi,
  type FeedbackCommentAfterCreateEvent,
} from "../src/client/index.js";
import type { ComponentApi } from "../src/component/_generated/component.js";

const component = {
  entries: {
    create: "entries:create",
    setUpvote: "entries:setUpvote",
  },
  comments: {
    create: "comments:create",
    setLike: "comments:setLike",
  },
} as unknown as ComponentApi<"feedback">;

async function invokeMutation<Args extends DefaultFunctionArgs, Result>(
  mutation: RegisteredMutation<"public", Args, Promise<Result>>,
  ctx: GenericMutationCtx<never>,
  args: Args,
): Promise<Result> {
  return await (
    mutation as unknown as {
      _handler: (
        handlerCtx: GenericMutationCtx<never>,
        handlerArgs: Args,
      ) => Promise<Result>;
    }
  )._handler(ctx, args);
}

function entryResult(args: {
  actorId: string;
  kind: "feedback" | "feature_request" | "bug_report";
  title: string;
  body: string;
  metadata?: { standard?: Record<string, string | number | boolean> };
}) {
  return {
    id: "entry-1",
    entry: {
      id: "entry-1",
      actorId: args.actorId,
      kind: args.kind,
      status: "open" as const,
      title: args.title.trim(),
      body: args.body.trim(),
      ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
      upvoteCount: 1,
      commentCount: 0,
    },
  };
}

function commentResult(args: {
  actorId: string;
  entryId: string;
  parentCommentId?: string;
  body: string;
}) {
  return {
    id: "comment-1",
    comment: {
      id: "comment-1",
      actorId: args.actorId,
      entryId: args.entryId,
      ...(args.parentCommentId === undefined
        ? {}
        : { parentCommentId: args.parentCommentId }),
      body: args.body.trim(),
      depth: args.parentCommentId === undefined ? 0 : 1,
    },
    entry: {
      id: args.entryId,
      actorId: "entry-author",
      kind: "feedback" as const,
      status: "open" as const,
      title: "Entry title",
    },
    ...(args.parentCommentId === undefined
      ? {}
      : {
          parentComment: {
            id: args.parentCommentId,
            actorId: "parent-author",
          },
        }),
  };
}

function context(runMutation: ReturnType<typeof vi.fn>) {
  return {
    db: { marker: "db" },
    auth: { marker: "auth" },
    storage: { marker: "storage" },
    scheduler: { runAfter: vi.fn(() => Promise.resolve("scheduled-1")) },
    runQuery: vi.fn(() => Promise.resolve(42)),
    runMutation,
    meta: { marker: "meta" },
  } as unknown as GenericMutationCtx<never>;
}

const createEntryArgs = {
  kind: "feedback" as const,
  title: "Original title",
  body: "Original body",
};

describe("feedback lifecycle callbacks", () => {
  test("runs entry lifecycle in order with the full context and persisted transforms", async () => {
    const calls: string[] = [];
    const runMutation = vi.fn(
      (reference: string, args: Parameters<typeof entryResult>[0]) => {
        expect(reference).toBe("entries:create");
        expect(args).toMatchObject({ includeCallbackContext: true });
        calls.push("component");
        return Promise.resolve(entryResult(args));
      },
    );
    const ctx = context(runMutation);
    const afterCreate = vi.fn();
    const api = exposeFeedbackApi(component, {
      actor: () => {
        calls.push("actor");
        return Promise.resolve({ id: "actor-1" });
      },
      rateLimiters: {
        createEntry: () => {
          calls.push("rate-limit");
          return Promise.resolve();
        },
      },
      callbacks: {
        entries: {
          beforeCreate: (callbackCtx, event) => {
            calls.push("before");
            expect(callbackCtx).toBe(ctx);
            expect(callbackCtx.db).toBe(ctx.db);
            expect(callbackCtx.auth).toBe(ctx.auth);
            expect(callbackCtx.storage).toBe(ctx.storage);
            expect(callbackCtx.scheduler).toBe(ctx.scheduler);
            expect(callbackCtx.runQuery).toBe(ctx.runQuery);
            expect(callbackCtx.runMutation).toBe(ctx.runMutation);
            expect(callbackCtx.meta).toBe(ctx.meta);
            expect(event).toEqual({
              actor: { id: "actor-1" },
              input: createEntryArgs,
            });
            return {
              kind: "bug_report",
              title: "  Clean title  ",
              body: "  Clean body  ",
              metadata: { standard: { source: "callback" } },
            };
          },
          afterCreate: (callbackCtx, event) => {
            calls.push("after");
            expect(callbackCtx).toBe(ctx);
            expect(event.entry).toMatchObject({
              title: "Clean title",
              body: "Clean body",
              kind: "bug_report",
              metadata: { standard: { source: "callback" } },
            });
            afterCreate(event);
          },
        },
      },
    });

    await expect(
      invokeMutation(api.createEntry, ctx, createEntryArgs),
    ).resolves.toBe("entry-1");
    expect(calls).toEqual([
      "actor",
      "rate-limit",
      "before",
      "component",
      "after",
    ]);
    expect(afterCreate).toHaveBeenCalledOnce();
  });

  test("preserves undefined entry patches and transforms only comment body", async () => {
    const runMutation = vi.fn((reference: string, args: never) =>
      Promise.resolve(
        reference === "entries:create"
          ? entryResult(args as Parameters<typeof entryResult>[0])
          : commentResult(args as Parameters<typeof commentResult>[0]),
      ),
    );
    const ctx = context(runMutation);
    const commentAfter =
      vi.fn<(event: FeedbackCommentAfterCreateEvent) => void>();
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: {
        entries: {
          beforeCreate: (_callbackCtx, event) => {
            // @ts-expect-error Callback actor identity is readonly.
            event.actor.id = "leaked-actor";
            // @ts-expect-error Callback inputs are readonly snapshots.
            event.input.title = "leaked title";
            if (event.input.metadata?.standard !== undefined) {
              // @ts-expect-error Nested callback metadata is readonly too.
              event.input.metadata.standard.source = "leaked source";
            }
            return undefined;
          },
        },
        comments: {
          beforeCreate: (_callbackCtx, event) => {
            expect(event.input.entryId).toBe("entry-1");
            expect(event.input.parentCommentId).toBe("parent-1");
            // @ts-expect-error Callback inputs are readonly.
            event.input.entryId = "leaked-entry";
            // @ts-expect-error Callback relationship inputs are readonly.
            event.input.parentCommentId = "leaked-parent";
            return { body: "  transformed comment  " };
          },
          afterCreate: (_callbackCtx, event) => {
            commentAfter(event);
          },
        },
      },
    });

    const originalEntryArgs = {
      ...createEntryArgs,
      metadata: { standard: { source: "original source" } },
    };
    await invokeMutation(api.createEntry, ctx, originalEntryArgs);
    await invokeMutation(api.createComment, ctx, {
      entryId: "entry-1",
      parentCommentId: "parent-1",
      body: "original comment",
    });

    expect(runMutation.mock.calls[0]?.[1]).toMatchObject(originalEntryArgs);
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      actorId: "actor-1",
      includeCallbackContext: false,
    });
    expect(runMutation.mock.calls[1]?.[1]).toMatchObject({
      entryId: "entry-1",
      parentCommentId: "parent-1",
      body: "  transformed comment  ",
      includeCallbackContext: true,
    });
    const afterEvent = commentAfter.mock.calls[0]?.[0];
    expect(afterEvent?.comment.body).toBe("transformed comment");
    expect(afterEvent?.comment.depth).toBe(1);
    expect(afterEvent?.parentComment).toEqual({
      id: "parent-1",
      actorId: "parent-author",
    });
  });

  test("rate-limit return rejection prevents beforeCreate", async () => {
    const beforeCreate = vi.fn();
    const runMutation = vi.fn();
    const rejection = { kind: "rate_limited" as const };
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      rateLimiters: { createEntry: () => Promise.resolve(rejection) },
      config: {
        rateLimiting: {
          behavior: "return",
          returns: v.object({ kind: v.literal("rate_limited") }),
        },
      },
      callbacks: { entries: { beforeCreate } },
    });

    await expect(
      invokeMutation(api.createEntry, context(runMutation), createEntryArgs),
    ).resolves.toEqual(rejection);
    expect(beforeCreate).not.toHaveBeenCalled();
    expect(runMutation).not.toHaveBeenCalled();
  });

  test("default reject throws and return-mode reject short-circuits both create mutations", async () => {
    const runMutation = vi.fn();
    const throwingApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: {
        entries: {
          beforeCreate: (_ctx, _event, { reject }) =>
            reject({ kind: "content_rejected", reason: "Profanity" }),
        },
      },
    });
    await expect(
      invokeMutation(
        throwingApi.createEntry,
        context(runMutation),
        createEntryArgs,
      ),
    ).rejects.toBeInstanceOf(ConvexError);

    const rejection = {
      kind: "content_rejected" as const,
      reason: "Profanity",
    };
    const callbackRejectionValidator = v.object({
      kind: v.literal("content_rejected"),
      reason: v.string(),
    });
    const returningApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: {
        rejection: { behavior: "return", returns: callbackRejectionValidator },
        comments: {
          beforeCreate: (_ctx, _event, { reject }) => reject(rejection),
        },
      },
    });
    const result = await invokeMutation(
      returningApi.createComment,
      context(runMutation),
      {
        entryId: "entry-1",
        body: "bad",
      },
    );
    expect(result).toEqual(rejection);
    expectTypeOf(result).toEqualTypeOf<string | typeof rejection>();
    expect(runMutation).not.toHaveBeenCalled();
  });

  test("does not convert unexpected callback failures in return mode", async () => {
    const failure = new Error("Database unavailable");
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: {
        rejection: {
          behavior: "return",
          returns: v.object({ kind: v.literal("content_rejected") }),
        },
        entries: {
          beforeCreate: () => {
            throw failure;
          },
        },
      },
    });
    await expect(
      invokeMutation(api.createEntry, context(vi.fn()), createEntryArgs),
    ).rejects.toBe(failure);
  });

  test("does not run afterCreate on component failure or before rejection", async () => {
    const afterCreate = vi.fn();
    const componentFailure = new Error("validation failed");
    const failingApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: { entries: { afterCreate } },
    });
    await expect(
      invokeMutation(
        failingApi.createEntry,
        context(vi.fn(() => Promise.reject(componentFailure))),
        createEntryArgs,
      ),
    ).rejects.toBe(componentFailure);

    const rejectingApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: {
        entries: {
          beforeCreate: (_ctx, _event, { reject }) => reject("not allowed"),
          afterCreate,
        },
      },
    });
    await expect(
      invokeMutation(
        rejectingApi.createEntry,
        context(vi.fn()),
        createEntryArgs,
      ),
    ).rejects.toBeInstanceOf(ConvexError);
    expect(afterCreate).not.toHaveBeenCalled();
  });

  test("awaits afterCreate and exposes typed host calls and scheduling", async () => {
    const afterFailure = new Error("required nested mutation failed");
    const queryRef = "host:get" as unknown as FunctionReference<
      "query",
      "internal",
      { id: string },
      number
    >;
    const mutationRef = "host:update" as unknown as FunctionReference<
      "mutation",
      "internal",
      { id: string },
      string
    >;
    const actionRef = "host:notify" as unknown as FunctionReference<
      "action",
      "internal",
      { id: string },
      null
    >;
    const runMutation = vi.fn(
      (reference: string, args: Parameters<typeof entryResult>[0]) =>
        reference === "entries:create"
          ? Promise.resolve(entryResult(args))
          : Promise.reject(afterFailure),
    );
    const ctx = context(runMutation);
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      callbacks: {
        entries: {
          afterCreate: async (callbackCtx) => {
            const queryResult = await callbackCtx.runQuery(queryRef, {
              id: "user-1",
            });
            expectTypeOf(queryResult).toEqualTypeOf<number>();
            await callbackCtx.scheduler.runAfter(0, actionRef, {
              id: "user-1",
            });
            await callbackCtx.runMutation(mutationRef, { id: "user-1" });
          },
        },
      },
    });

    await expect(
      invokeMutation(api.createEntry, ctx, createEntryArgs),
    ).rejects.toBe(afterFailure);
  });

  test("emits authoritative entry and comment reaction transitions only on changes", async () => {
    const afterChange = vi.fn();
    const results = [
      {
        changed: true as const,
        active: true,
        transition: "added" as const,
        previousCount: 4,
        count: 5,
        entry: {
          id: "entry-1",
          actorId: "entry-author",
          kind: "feedback" as const,
          status: "open" as const,
          title: "Entry title",
        },
      },
      {
        changed: false as const,
        active: true,
        transition: null,
        previousCount: 5,
        count: 5,
      },
      {
        changed: true as const,
        active: false,
        transition: "removed" as const,
        previousCount: 3,
        count: 2,
        comment: {
          id: "comment-1",
          actorId: "comment-author",
          entryId: "entry-1",
          body: "Comment body",
        },
      },
      {
        changed: false as const,
        active: false,
        transition: null,
        previousCount: 2,
        count: 2,
      },
    ];
    const runMutation = vi.fn(() => Promise.resolve(results.shift()));
    const ctx = context(runMutation);
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "reactor" }),
      callbacks: { reactions: { afterChange } },
    });

    await expect(
      invokeMutation(api.setEntryUpvote, ctx, {
        entryId: "entry-1",
        desiredState: true,
      }),
    ).resolves.toEqual({ active: true, upvoteCount: 5 });
    await invokeMutation(api.setEntryUpvote, ctx, {
      entryId: "entry-1",
      desiredState: true,
    });
    await expect(
      invokeMutation(api.setCommentLike, ctx, {
        commentId: "comment-1",
        desiredState: false,
      }),
    ).resolves.toEqual({ active: false, likeCount: 2 });
    await invokeMutation(api.setCommentLike, ctx, {
      commentId: "comment-1",
      desiredState: false,
    });

    expect(afterChange).toHaveBeenCalledTimes(2);
    expect(afterChange.mock.calls[0]?.[1]).toMatchObject({
      type: "entry_upvote",
      transition: "added",
      active: true,
      previousCount: 4,
      count: 5,
      actor: { id: "reactor" },
      entry: { actorId: "entry-author" },
    });
    expect(afterChange.mock.calls[1]?.[1]).toMatchObject({
      type: "comment_like",
      transition: "removed",
      active: false,
      previousCount: 3,
      count: 2,
      comment: { actorId: "comment-author" },
    });
    expect(runMutation.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          "entries:setUpvote",
          expect.objectContaining({ includeCallbackContext: true }),
        ]),
        expect.arrayContaining([
          "comments:setLike",
          expect.objectContaining({ includeCallbackContext: true }),
        ]),
      ]),
    );
  });

  test("keeps all component mutation results lean when after callbacks are absent", async () => {
    const runMutation = vi.fn(
      (reference: string, args: { desiredState?: boolean }) => {
        expect(args).toMatchObject({ includeCallbackContext: false });
        if (reference === "entries:create")
          return Promise.resolve({ id: "entry-1" });
        if (reference === "comments:create") {
          return Promise.resolve({ id: "comment-1" });
        }
        if (reference === "entries:setUpvote") {
          return Promise.resolve({ active: args.desiredState, upvoteCount: 2 });
        }
        return Promise.resolve({ active: args.desiredState, likeCount: 3 });
      },
    );
    const ctx = context(runMutation);
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
    });

    await expect(
      invokeMutation(api.createEntry, ctx, createEntryArgs),
    ).resolves.toBe("entry-1");
    await expect(
      invokeMutation(api.createComment, ctx, {
        entryId: "entry-1",
        body: "Comment",
      }),
    ).resolves.toBe("comment-1");
    await expect(
      invokeMutation(api.setEntryUpvote, ctx, {
        entryId: "entry-1",
        desiredState: true,
      }),
    ).resolves.toEqual({ active: true, upvoteCount: 2 });
    await expect(
      invokeMutation(api.setCommentLike, ctx, {
        commentId: "comment-1",
        desiredState: false,
      }),
    ).resolves.toEqual({ active: false, likeCount: 3 });
    expect(runMutation).toHaveBeenCalledTimes(4);
  });

  test("skips beforeCreate snapshots and metadata cloning when callbacks are absent", async () => {
    let actorOwnKeys = 0;
    let metadataRecordOwnKeys = 0;
    const actor = new Proxy(
      { id: "actor-1" },
      {
        ownKeys: (target) => {
          actorOwnKeys += 1;
          return Reflect.ownKeys(target);
        },
      },
    );
    const standard = new Proxy(
      { source: "original" },
      {
        ownKeys: (target) => {
          metadataRecordOwnKeys += 1;
          return Reflect.ownKeys(target);
        },
      },
    );
    const metadata = { standard };
    const runMutation = vi.fn(
      (reference: string, args: { metadata?: unknown }) => {
        if (reference === "entries:create") {
          expect(args.metadata).toBe(metadata);
          return Promise.resolve({ id: "entry-1" });
        }
        return Promise.resolve({ id: "comment-1" });
      },
    );
    const ctx = context(runMutation);
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve(actor),
    });

    await invokeMutation(api.createEntry, ctx, {
      ...createEntryArgs,
      metadata,
    });
    await invokeMutation(api.createComment, ctx, {
      entryId: "entry-1",
      body: "Comment",
    });

    expect(actorOwnKeys).toBe(0);
    expect(metadataRecordOwnKeys).toBe(0);
  });

  test("composes rate-limit and callback rejection unions only for create mutations", () => {
    const rateValidator = v.object({ kind: v.literal("rate_limited") });
    const callbackValidator = v.object({
      kind: v.literal("content_rejected"),
      reason: v.string(),
    });
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1" }),
      config: {
        rateLimiting: { behavior: "return", returns: rateValidator },
      },
      callbacks: {
        rejection: { behavior: "return", returns: callbackValidator },
      },
    });
    expect(api).toBeDefined();

    type MutationResult<Mutation> =
      Mutation extends RegisteredMutation<
        "public",
        DefaultFunctionArgs,
        Promise<infer Result>
      >
        ? Result
        : never;
    expectTypeOf<MutationResult<typeof api.createEntry>>().toEqualTypeOf<
      | string
      | { kind: "rate_limited" }
      | { kind: "content_rejected"; reason: string }
    >();
    expectTypeOf<MutationResult<typeof api.setEntryUpvote>>().toEqualTypeOf<
      { active: boolean; upvoteCount: number } | { kind: "rate_limited" }
    >();
  });
});
