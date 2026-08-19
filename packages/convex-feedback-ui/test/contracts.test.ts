import { describe, expect, test } from "vitest";

import {
  englishFeedbackMessages,
  mergeFeedbackMessages,
} from "../src/shared/messages.js";
import {
  defaultFeedbackTheme,
  mergeFeedbackTheme,
} from "../src/shared/theme.js";

describe("UI contracts", () => {
  test("message overrides preserve the complete English fallback", () => {
    const messages = mergeFeedbackMessages({
      board: { title: "Ideas" },
      comments: { like: "Helpful" },
    });
    expect(messages.board.title).toBe("Ideas");
    expect(messages.board.searchPlaceholder).toBe(
      englishFeedbackMessages.board.searchPlaceholder,
    );
    expect(messages.comments.like).toBe("Helpful");
    expect(messages.statuses.in_progress).toBe("In progress");
  });

  test("all fixed kinds and statuses have copy", () => {
    expect(Object.keys(englishFeedbackMessages.kinds).sort()).toEqual(
      ["bug_report", "feature_request", "feedback"].sort(),
    );
    expect(Object.keys(englishFeedbackMessages.statuses).sort()).toEqual(
      [
        "open",
        "under_review",
        "planned",
        "in_progress",
        "completed",
        "closed",
      ].sort(),
    );
  });

  test("theme overrides preserve fallback tokens", () => {
    const theme = mergeFeedbackTheme({ colors: { primary: "#000000" } });
    expect(theme.colors.primary).toBe("#000000");
    expect(theme.colors.border).toBe(defaultFeedbackTheme.colors.border);
    expect(theme.radius).toBe(defaultFeedbackTheme.radius);
  });
});
