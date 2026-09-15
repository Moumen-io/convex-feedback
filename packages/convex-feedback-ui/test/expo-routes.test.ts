import { describe, expect, test } from "vitest";

import {
  feedbackBoardRouteHref,
  createFeedbackStackSettings,
  defaultFeedbackRoutes,
  feedbackEditRouteHref,
  feedbackCreateStackSettings,
  feedbackRouteHref,
  feedbackStackSettings,
  createRoadmapStackSettings,
  defaultRoadmapRoutes,
  resolveFeedbackRoutes,
  resolveRoadmapRoutes,
  roadmapRouteHref,
  roadmapStackSettings,
} from "../src/native/expo/routes.js";

describe("Expo routed feedback contracts", () => {
  test("uses the prescribed route names by default", () => {
    expect(resolveFeedbackRoutes()).toEqual(defaultFeedbackRoutes);
    expect(feedbackStackSettings).toEqual({ anchor: "index" });
    expect(feedbackCreateStackSettings).toEqual({ anchor: "index" });
    expect(resolveRoadmapRoutes()).toEqual(defaultRoadmapRoutes);
    expect(roadmapStackSettings).toEqual({ anchor: "index" });
  });

  test("merges partial route overrides", () => {
    const routes = resolveFeedbackRoutes({
      entry: "entry/[entryId]",
      create: "create",
    });

    expect(routes).toEqual({
      board: "index",
      entry: "entry/[entryId]",
      edit: "entry/[entryId]/edit",
      create: "create",
    });
    expect(createFeedbackStackSettings({ board: "board" })).toEqual({
      anchor: "board",
    });
  });

  test("supports an explicit index entry route", () => {
    expect(resolveFeedbackRoutes({ entry: "entry/[entryId]/index" })).toEqual({
      board: "index",
      entry: "entry/[entryId]/index",
      edit: "entry/[entryId]/edit",
      create: "new",
    });
    expect(
      resolveFeedbackRoutes({
        entry: "entry/[entryId]/index",
        edit: "entry/[entryId]/edit",
      }),
    ).toEqual({
      board: "index",
      entry: "entry/[entryId]/index",
      edit: "entry/[entryId]/edit",
      create: "new",
    });
  });

  test("requires the stable entryId dynamic parameter", () => {
    expect(() => resolveFeedbackRoutes({ entry: "[id]" })).toThrow("[entryId]");
    expect(() => resolveFeedbackRoutes({ edit: "edit/[entryId]" })).toThrow(
      "nested under",
    );
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
    expect(feedbackEditRouteHref("[entryId]/edit")).toBe("./edit");
    expect(feedbackEditRouteHref("entry/[entryId]/edit")).toBe("./edit");
    expect(feedbackBoardRouteHref("[entryId]", "index")).toBe("../index");
    expect(feedbackBoardRouteHref("[entryId]/index", "index")).toBe("../index");
    expect(feedbackBoardRouteHref("entry/[entryId]", "index")).toBe(
      "../../index",
    );
    expect(feedbackBoardRouteHref("entry/[entryId]/index", "index")).toBe(
      "../../index",
    );
  });

  test("validates and builds roadmap routes", () => {
    expect(resolveRoadmapRoutes({ item: "items/[roadmapId]" })).toEqual({
      board: "index",
      item: "items/[roadmapId]",
    });
    expect(createRoadmapStackSettings({ board: "roadmap" })).toEqual({
      anchor: "roadmap",
    });
    expect(
      roadmapRouteHref("items/[roadmapId]", { roadmapId: "roadmap-1" }),
    ).toEqual({
      pathname: "./items/[roadmapId]",
      params: { roadmapId: "roadmap-1" },
    });
    expect(() => resolveRoadmapRoutes({ item: "items/[id]" })).toThrow(
      "[roadmapId]",
    );
  });
});
