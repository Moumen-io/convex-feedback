import { expect, expectTypeOf, test } from "vitest";
import type { ApiFromModules } from "convex/server";
import { v } from "convex/values";

import { exposeFeedbackApi } from "../src/client/index.js";
import type { ComponentApi } from "../src/component/_generated/component.js";
import { createFeedbackHooks, type FeedbackHooks } from "../src/react/index.js";

type HookMutationResult<Hook extends () => (...args: never[]) => unknown> =
  Awaited<ReturnType<ReturnType<Hook>>>;

declare const component: ComponentApi<"feedback">;

const exposeThrowingApi = () =>
  exposeFeedbackApi(component, { actor: () => Promise.resolve(null) });
const exposeReturningApi = () =>
  exposeFeedbackApi(component, {
    actor: () => Promise.resolve(null),
    config: {
      rateLimiting: {
        behavior: "return",
        returns: v.object({ kind: v.literal("rate_limited") }),
      },
    },
  });

type GeneratedApi = ApiFromModules<{
  feedback: ReturnType<typeof exposeThrowingApi>;
}>;
type GeneratedReturningApi = ApiFromModules<{
  feedback: ReturnType<typeof exposeReturningApi>;
}>;

declare const generatedApi: GeneratedApi;
declare const generatedReturningApi: GeneratedReturningApi;

function assertHookTypes() {
  const throwingHooks = createFeedbackHooks(generatedApi.feedback);
  const returningHooks = createFeedbackHooks(generatedReturningApi.feedback);

  expectTypeOf(throwingHooks).toEqualTypeOf<FeedbackHooks>();
  expectTypeOf(returningHooks).toEqualTypeOf<
    FeedbackHooks<{ kind: "rate_limited" }>
  >();
  expectTypeOf<
    HookMutationResult<typeof throwingHooks.useCreateEntry>
  >().toEqualTypeOf<string>();
  expectTypeOf<
    HookMutationResult<typeof returningHooks.useCreateEntry>
  >().toEqualTypeOf<string | { kind: "rate_limited" }>();
}

void exposeThrowingApi;
void exposeReturningApi;
void assertHookTypes;

test("infers throwing and returning hook mutation results", () => {
  expect(true).toBe(true);
});
