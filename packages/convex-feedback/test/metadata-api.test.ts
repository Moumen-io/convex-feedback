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
  test("only the host-resolved moderator flag reaches getEntry", async () => {
    const moderatorRunQuery = vi.fn(() => Promise.resolve(null));
    const memberRunQuery = vi.fn(() => Promise.resolve(null));
    const moderatorApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "moderator-1", isModerator: true }),
    });
    const memberApi = exposeFeedbackApi(component, {
      actor: () => Promise.resolve({ id: "member-1", isModerator: false }),
    });

    await invokeQuery(
      moderatorApi.getEntry,
      { runQuery: moderatorRunQuery } as unknown as GenericQueryCtx<never>,
      { entryId: "entry-1" },
    );
    await invokeQuery(
      memberApi.getEntry,
      { runQuery: memberRunQuery } as unknown as GenericQueryCtx<never>,
      { entryId: "entry-1" },
    );

    expect(moderatorRunQuery).toHaveBeenCalledWith("entries:get", {
      entryId: "entry-1",
      viewerActorId: "moderator-1",
      viewerIsModerator: true,
    });
    expect(memberRunQuery).toHaveBeenCalledWith("entries:get", {
      entryId: "entry-1",
      viewerActorId: "member-1",
    });
  });
});
