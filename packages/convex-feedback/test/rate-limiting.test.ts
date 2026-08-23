import type {
  DefaultFunctionArgs,
  GenericMutationCtx,
  RegisteredMutation,
} from "convex/server";
import { v } from "convex/values";
import { describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  exposeFeedbackApi,
  type FeedbackRateLimiter,
} from "../src/client/index.js";
import type { ComponentApi } from "../src/component/_generated/component.js";

const component = {
  entries: {
    list: "entries:list",
    get: "entries:get",
    search: "entries:search",
    similar: "entries:similar",
    create: "entries:create",
    update: "entries:update",
    setStatus: "entries:setStatus",
    setUpvote: "entries:setUpvote",
  },
  comments: {
    list: "comments:list",
    create: "comments:create",
    update: "comments:update",
    remove: "comments:remove",
    setLike: "comments:setLike",
  },
} as unknown as ComponentApi<"feedback">;

function mutationContext(runMutation: ReturnType<typeof vi.fn>) {
  return {
    runMutation,
  } as unknown as GenericMutationCtx<never>;
}

async function invokeMutation<Args extends DefaultFunctionArgs, Result>(
  mutation: RegisteredMutation<"public", Args, Promise<Result>>,
  ctx: GenericMutationCtx<never>,
  args: Args,
): Promise<Result> {
  const registered = mutation as unknown as {
    _handler: (
      handlerCtx: GenericMutationCtx<never>,
      handlerArgs: Args,
    ) => Promise<Result>;
  };
  return await registered._handler(ctx, args);
}

const createEntryArgs = {
  kind: "feedback" as const,
  title: "Rate limits",
  body: "Please protect this endpoint.",
};

describe("feedback rate limiting", () => {
  test("uses actor IDs as keys and preserves throwing limiter behavior", async () => {
    const runMutation = vi.fn();
    const rejection = new Error("limited");
    const limiter = vi.fn((): Promise<void> => Promise.reject(rejection));
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
      rateLimiters: { createEntry: limiter },
    });

    await expect(
      invokeMutation(
        api.createEntry,
        mutationContext(runMutation),
        createEntryArgs,
      ),
    ).rejects.toBe(rejection);
    expect(limiter).toHaveBeenCalledWith(expect.anything(), "actor-1");
    expect(runMutation).not.toHaveBeenCalled();
  });

  test("returns a validated rejection and skips the component mutation", async () => {
    const runMutation = vi.fn();
    const rejected = { kind: "rate_limited" as const, retryAt: 12_345 };
    const rejectionValidator = v.object({
      kind: v.literal("rate_limited"),
      retryAt: v.number(),
    });
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
      rateLimiters: {
        createEntry: () => Promise.resolve(rejected),
      },
      config: {
        rateLimiting: {
          behavior: "return",
          returns: rejectionValidator,
        },
      },
    });

    const result = await invokeMutation(
      api.createEntry,
      mutationContext(runMutation),
      createEntryArgs,
    );

    expect(result).toEqual(rejected);
    expect(runMutation).not.toHaveBeenCalled();
    const typedResult: string | typeof rejected = result;
    expect(typedResult).toEqual(rejected);
    expectTypeOf<string | typeof rejected>().toMatchTypeOf(result);
  });

  test("treats undefined as a pass and runs the component mutation", async () => {
    const runMutation = vi.fn(() => Promise.resolve("entry-1"));
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
      rateLimiters: { createEntry: () => Promise.resolve(undefined) },
      config: {
        rateLimiting: {
          behavior: "return",
          returns: v.object({ kind: v.literal("rate_limited") }),
        },
      },
    });

    await expect(
      invokeMutation(
        api.createEntry,
        mutationContext(runMutation),
        createEntryArgs,
      ),
    ).resolves.toBe("entry-1");
    expect(runMutation).toHaveBeenCalledOnce();
  });

  test("ignores a defined return value at runtime in throwing mode", async () => {
    const runMutation = vi.fn(() => Promise.resolve("entry-1"));
    const nullLimiter = (() =>
      Promise.resolve(null)) as unknown as FeedbackRateLimiter;
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
      rateLimiters: { createEntry: nullLimiter },
    });

    await expect(
      invokeMutation(
        api.createEntry,
        mutationContext(runMutation),
        createEntryArgs,
      ),
    ).resolves.toBe("entry-1");
    expect(runMutation).toHaveBeenCalledOnce();
  });

  test("rejects null in return mode if static typing is bypassed", async () => {
    const runMutation = vi.fn();
    const nullLimiter = (() =>
      Promise.resolve(null)) as unknown as FeedbackRateLimiter<{
      kind: "rate_limited";
    }>;
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
      rateLimiters: { createEntry: nullLimiter },
      config: {
        rateLimiting: {
          behavior: "return",
          returns: v.object({ kind: v.literal("rate_limited") }),
        },
      },
    });

    await expect(
      invokeMutation(
        api.createEntry,
        mutationContext(runMutation),
        createEntryArgs,
      ),
    ).rejects.toThrow("return-mode feedback rate limiter returned null");
    expect(runMutation).not.toHaveBeenCalled();
  });

  test("bypasses moderators by default and can opt them into limits", async () => {
    const runMutation = vi.fn(() => Promise.resolve(null));
    const limiter = vi.fn(() => Promise.resolve(undefined));
    const defaultApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "moderator-1", isModerator: true }),
      rateLimiters: { editContent: limiter },
    });

    await invokeMutation(
      defaultApi.setEntryStatus,
      mutationContext(runMutation),
      { entryId: "entry-1", status: "planned" },
    );
    expect(limiter).not.toHaveBeenCalled();

    const limitedApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "moderator-1", isModerator: true }),
      rateLimiters: { editContent: limiter },
      config: { rateLimiting: { limitModerators: true } },
    });
    await invokeMutation(
      limitedApi.setEntryStatus,
      mutationContext(runMutation),
      { entryId: "entry-1", status: "planned" },
    );
    expect(limiter).toHaveBeenCalledWith(expect.anything(), "moderator-1");
  });

  test("rejects non-moderator status changes before rate limiting", async () => {
    const runMutation = vi.fn();
    const limiter = vi.fn(() => Promise.resolve(undefined));
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
      rateLimiters: { editContent: limiter },
    });

    await expect(
      invokeMutation(api.setEntryStatus, mutationContext(runMutation), {
        entryId: "entry-1",
        status: "planned",
      }),
    ).rejects.toThrow("Moderator permissions are required.");
    expect(limiter).not.toHaveBeenCalled();
    expect(runMutation).not.toHaveBeenCalled();
  });

  test("applies each limiter to every mutation in its group", async () => {
    const runMutation = vi.fn(() => Promise.resolve(null));
    const createEntry = vi.fn(() => Promise.resolve(undefined));
    const createComment = vi.fn(() => Promise.resolve(undefined));
    const editContent = vi.fn(() => Promise.resolve(undefined));
    const reactions = vi.fn(() => Promise.resolve(undefined));
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "moderator-1", isModerator: true }),
      rateLimiters: { createEntry, createComment, editContent, reactions },
      config: { rateLimiting: { limitModerators: true } },
    });
    const ctx = mutationContext(runMutation);

    await invokeMutation(api.createEntry, ctx, createEntryArgs);
    await invokeMutation(api.createComment, ctx, {
      entryId: "entry-1",
      body: "A comment",
    });
    await invokeMutation(api.updateEntry, ctx, {
      entryId: "entry-1",
      title: "Updated",
      body: "Updated body",
    });
    await invokeMutation(api.setEntryStatus, ctx, {
      entryId: "entry-1",
      status: "completed",
    });
    await invokeMutation(api.updateComment, ctx, {
      commentId: "comment-1",
      body: "Updated comment",
    });
    await invokeMutation(api.deleteComment, ctx, { commentId: "comment-1" });
    await invokeMutation(api.setEntryUpvote, ctx, {
      entryId: "entry-1",
      desiredState: true,
    });
    await invokeMutation(api.setCommentLike, ctx, {
      commentId: "comment-1",
      desiredState: true,
    });

    expect(createEntry).toHaveBeenCalledOnce();
    expect(createComment).toHaveBeenCalledOnce();
    expect(editContent).toHaveBeenCalledTimes(4);
    expect(reactions).toHaveBeenCalledTimes(2);
  });
});

// @ts-expect-error Return behavior requires a `returns` validator.
exposeFeedbackApi(component, {
  actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
  config: { rateLimiting: { behavior: "return" } },
});

exposeFeedbackApi(component, {
  actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
  rateLimiters: {
    // @ts-expect-error Throwing limiters may only resolve to void/undefined.
    createEntry: () => Promise.resolve(null),
  },
});

exposeFeedbackApi(component, {
  actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
  config: {
    rateLimiting: {
      behavior: "return",
      // @ts-expect-error Return-mode validators may not include null in a union.
      returns: v.union(v.object({ kind: v.literal("rate_limited") }), v.null()),
    },
  },
});

exposeFeedbackApi(component, {
  actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
  config: {
    rateLimiting: {
      behavior: "return",
      // @ts-expect-error Return-mode rejection validators may not include null.
      returns: v.null(),
    },
  },
});

exposeFeedbackApi(component, {
  actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
  rateLimiters: {
    // @ts-expect-error Null does not match this return-mode validator.
    createEntry: () => Promise.resolve(null),
  },
  config: {
    rateLimiting: {
      behavior: "return",
      returns: v.object({ kind: v.literal("rate_limited") }),
    },
  },
});

exposeFeedbackApi(component, {
  actor: () => Promise.resolve({ id: "actor-1", isModerator: false }),
  rateLimiters: {
    // @ts-expect-error Rejection values must match the configured validator.
    createEntry: () => Promise.resolve("rate_limited"),
  },
  config: {
    rateLimiting: {
      behavior: "return",
      returns: v.object({ kind: v.literal("rate_limited") }),
    },
  },
});
