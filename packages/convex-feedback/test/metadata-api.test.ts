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
});
