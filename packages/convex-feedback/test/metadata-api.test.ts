import type {
  DefaultFunctionArgs,
  GenericQueryCtx,
  RegisteredQuery,
} from "convex/server";
import { describe, expect, test, vi } from "vitest";

import { exposeFeedbackApi } from "../src/client/index.js";
import type { ComponentApi } from "../src/component/_generated/component.js";

const component = {
  entries: {
    list: "entries:list",
    listByActor: "entries:listByActor",
    get: "entries:get",
    search: "entries:search",
    similar: "entries:similar",
    create: "entries:create",
    update: "entries:update",
    setStatus: "entries:setStatus",
    setUpvote: "entries:setUpvote",
  },
  admin: {
    listEntries: "admin:listEntries",
    getEntry: "admin:getEntry",
    searchEntries: "admin:searchEntries",
  },
  comments: {
    list: "comments:list",
    listByActor: "comments:listByActor",
    create: "comments:create",
    update: "comments:update",
    remove: "comments:remove",
    setLike: "comments:setLike",
  },
  reactions: {
    listByActor: "reactions:listByActor",
  },
  roadmap: {
    get: "roadmap:get",
    list: "roadmap:list",
    search: "roadmap:search",
    listFeedback: "roadmap:listFeedback",
  },
} as unknown as ComponentApi<"feedback">;

async function invokeQuery<Args extends DefaultFunctionArgs, Result>(
  query: RegisteredQuery<"public", Args, Promise<Result>>,
  ctx: GenericQueryCtx<never>,
  args: Args,
): Promise<Result> {
  const registered = query as unknown as {
    _handler: (
      handlerCtx: GenericQueryCtx<never>,
      handlerArgs: Args,
    ) => Promise<Result>;
  };
  return await registered._handler(ctx, args);
}

describe("metadata API authorization", () => {
  test("supports deprecated moderator actor fields with admin precedence", async () => {
    const legacyApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "legacy-1", isModerator: true }),
    });
    const newFieldWinsApi = exposeFeedbackApi(component, {
      actor: () =>
        Promise.resolve({
          id: "legacy-2",
          isAdmin: false,
          isModerator: true,
        }),
    });

    const context = {} as GenericQueryCtx<never>;
    await expect(invokeQuery(legacyApi.isAdmin, context, {})).resolves.toBe(
      true,
    );
    await expect(
      invokeQuery(newFieldWinsApi.isAdmin, context, {}),
    ).resolves.toBe(false);
  });

  test("only the host-resolved admin flag reaches getEntry", async () => {
    const adminRunQuery = vi.fn(() => Promise.resolve(null));
    const memberRunQuery = vi.fn(() => Promise.resolve(null));
    const adminApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "admin-1", isAdmin: true }),
    });
    const memberApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "member-1", isAdmin: false }),
    });

    await invokeQuery(
      adminApi.getEntry,
      { runQuery: adminRunQuery } as unknown as GenericQueryCtx<never>,
      { entryId: "entry-1" },
    );
    await invokeQuery(
      memberApi.getEntry,
      { runQuery: memberRunQuery } as unknown as GenericQueryCtx<never>,
      { entryId: "entry-1" },
    );

    expect(adminRunQuery).toHaveBeenCalledWith("entries:get", {
      entryId: "entry-1",
      viewerActorId: "admin-1",
      viewerIsAdmin: true,
    });
    expect(memberRunQuery).toHaveBeenCalledWith("entries:get", {
      entryId: "entry-1",
      viewerActorId: "member-1",
    });
  });

  test("admin wrappers preserve exact, bucket, and omitted status filters", async () => {
    const runQuery = vi.fn(() =>
      Promise.resolve({ page: [], isDone: true, continueCursor: "" }),
    );
    const adminApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "admin-1", isAdmin: true }),
    });
    const context = { runQuery } as unknown as GenericQueryCtx<never>;
    const paginationOpts = { cursor: null, numItems: 10 };

    await invokeQuery(adminApi.adminListEntries, context, {
      status: "open",
      paginationOpts,
    });
    await invokeQuery(adminApi.adminListEntries, context, {
      statusFilter: "open",
      paginationOpts,
    });
    await invokeQuery(adminApi.adminSearchEntries, context, {
      searchQuery: "feedback",
      paginationOpts,
    });

    expect(runQuery).toHaveBeenNthCalledWith(1, "admin:listEntries", {
      status: "open",
      paginationOpts,
      viewerActorId: "admin-1",
    });
    expect(runQuery).toHaveBeenNthCalledWith(2, "admin:listEntries", {
      statusFilter: "open",
      paginationOpts,
      viewerActorId: "admin-1",
    });
    expect(runQuery).toHaveBeenNthCalledWith(3, "admin:searchEntries", {
      searchQuery: "feedback",
      paginationOpts,
      viewerActorId: "admin-1",
    });
  });

  test("allows anonymous roadmap reads and omits a viewer actor", async () => {
    const runQuery = vi.fn(() => Promise.resolve({}));
    const publicApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve(null),
    });

    await invokeQuery(
      publicApi.listRoadmap,
      { runQuery } as unknown as GenericQueryCtx<never>,
      { paginationOpts: { cursor: null, numItems: 10 } },
    );
    await invokeQuery(
      publicApi.getRoadmapItem,
      { runQuery } as unknown as GenericQueryCtx<never>,
      { roadmapId: "roadmap-1" },
    );
    await invokeQuery(
      publicApi.searchRoadmap,
      { runQuery } as unknown as GenericQueryCtx<never>,
      { searchQuery: "roadmap", limit: 10 },
    );
    await invokeQuery(
      publicApi.listRoadmapFeedback,
      { runQuery } as unknown as GenericQueryCtx<never>,
      {
        roadmapId: "roadmap-1",
        paginationOpts: { cursor: null, numItems: 10 },
      },
    );

    expect(runQuery).toHaveBeenNthCalledWith(1, "roadmap:list", {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(runQuery).toHaveBeenNthCalledWith(2, "roadmap:get", {
      roadmapId: "roadmap-1",
    });
    expect(runQuery).toHaveBeenNthCalledWith(3, "roadmap:search", {
      searchQuery: "roadmap",
      limit: 10,
    });
    expect(runQuery).toHaveBeenNthCalledWith(4, "roadmap:listFeedback", {
      roadmapId: "roadmap-1",
      paginationOpts: { cursor: null, numItems: 10 },
    });
  });

  test("actor activity wrappers use only the host-resolved actor", async () => {
    const runQuery = vi.fn((reference: string) => {
      if (reference === "entries:listByActor") {
        return Promise.resolve({
          page: [
            {
              id: "entry-1",
              creationTime: 1,
              actorId: "resolved-actor",
              kind: "feedback" as const,
              status: "open" as const,
              title: "Entry",
              body: "Body",
              upvoteCount: 1,
              commentCount: 0,
              metadata: { standard: { platform: "web" } },
              priority: "high" as const,
            },
          ],
          continueCursor: "entry-cursor",
          isDone: true,
        });
      }
      return Promise.resolve({
        page: [],
        continueCursor: "cursor",
        isDone: true,
      });
    });
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "resolved-actor" }),
    });
    const context = { runQuery } as unknown as GenericQueryCtx<never>;

    const entries = await invokeQuery(api.listUserEntries, context, {
      paginationOpts: { cursor: null, numItems: 10 },
      actorId: "attacker-actor",
    } as never);
    await invokeQuery(api.listUserComments, context, {
      paginationOpts: { cursor: null, numItems: 10 },
      actorId: "attacker-actor",
    } as never);
    await invokeQuery(api.listUserReactions, context, {
      paginationOpts: { cursor: null, numItems: 10 },
      actorId: "attacker-actor",
    } as never);

    expect(entries.page[0]).not.toHaveProperty("metadata");
    expect(entries.page[0]).not.toHaveProperty("priority");
    expect(runQuery).toHaveBeenNthCalledWith(1, "entries:listByActor", {
      actorId: "resolved-actor",
      paginationOpts: { cursor: null, numItems: 10 },
      includeAdminContext: false,
    });
    expect(runQuery).toHaveBeenNthCalledWith(2, "comments:listByActor", {
      actorId: "resolved-actor",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(runQuery).toHaveBeenNthCalledWith(3, "reactions:listByActor", {
      actorId: "resolved-actor",
      paginationOpts: { cursor: null, numItems: 10 },
    });
  });

  test("actor activity wrappers require authentication", async () => {
    const api = exposeFeedbackApi(component, {
      actor: () => Promise.resolve(null),
    });
    const context = {
      runQuery: vi.fn(),
    } as unknown as GenericQueryCtx<never>;

    await expect(
      invokeQuery(api.listUserEntries, context, {
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).rejects.toThrow("Authentication is required.");
  });
});
