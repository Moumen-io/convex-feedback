import { describe, expect, test } from "vitest";

import {
  createFeedbackStackSettings,
  defaultFeedbackRoutes,
  feedbackCreateStackSettings,
  feedbackRouteHref,
  feedbackStackSettings,
  resolveFeedbackRoutes,
} from "../src/native/expo/routes.js";

describe("Expo routed feedback contracts", () => {
  test("uses the prescribed route names by default", () => {
    expect(resolveFeedbackRoutes()).toEqual(defaultFeedbackRoutes);
    expect(feedbackStackSettings).toEqual({ anchor: "index" });
    expect(feedbackCreateStackSettings).toEqual({ anchor: "index" });
  });

  test("merges partial route overrides", () => {
    const routes = resolveFeedbackRoutes({
      entry: "entry/[entryId]",
      create: "create",
    });

    expect(routes).toEqual({
      board: "index",
      entry: "entry/[entryId]",
      create: "create",
    });
    expect(createFeedbackStackSettings({ board: "board" })).toEqual({
      anchor: "board",
    });
  });

  test("requires the stable entryId dynamic parameter", () => {
    expect(() => resolveFeedbackRoutes({ entry: "[id]" })).toThrow("[entryId]");
  });

  test("builds relative route hrefs with optional parameters", () => {
    expect(feedbackRouteHref("new")).toBe("./new");
    expect(feedbackRouteHref("./new")).toBe("./new");
    expect(
      feedbackRouteHref("entry/[entryId]", { entryId: "entry-1" }),
    ).toEqual({
      pathname: "./entry/[entryId]",
      params: { entryId: "entry-1" },
    });
  });
});
