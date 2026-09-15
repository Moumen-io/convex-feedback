import { describe, expect, test } from "vitest";

import {
  englishFeedbackMessages,
  mergeFeedbackMessages,
} from "../src/shared/messages.js";
import { createEntryLabel, entryStatusChoices } from "../src/shared/helpers.js";
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
    expect(messages.metadata.title).toBe(
      englishFeedbackMessages.metadata.title,
    );
    expect(messages.form.saveChanges).toBe(
      englishFeedbackMessages.form.saveChanges,
    );
    expect(messages.form.editNotFound).toBe(
      englishFeedbackMessages.form.editNotFound,
    );
    expect(messages.form.retry).toBe(englishFeedbackMessages.form.retry);
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
    const theme = mergeFeedbackTheme({
      colors: { primary: "#000000", input: "#f4f4f4" },
    });
    expect(theme.colors.primary).toBe("#000000");
    expect(theme.colors.input).toBe("#f4f4f4");
    expect(theme.colors.border).toBe(defaultFeedbackTheme.colors.border);
    expect(theme.radius).toBe(defaultFeedbackTheme.radius);
  });

  test("create-entry labels follow the enabled kinds", () => {
    const messages = mergeFeedbackMessages();
    expect(createEntryLabel(["bug_report"], messages)).toBe(
      messages.newFeedback.bug_report,
    );
    expect(createEntryLabel(["feedback", "bug_report"], messages)).toBe(
      messages.board.createEntry,
    );
  });

  test("status filter choices use localized messages", () => {
    const messages = mergeFeedbackMessages({
      board: { statusFilter: "Status" },
      statuses: { open: "Ouvert", closed: "Fermé" },
    });

    expect(entryStatusChoices(messages)).toEqual([
      { value: "open", label: "Ouvert" },
      { value: "closed", label: "Fermé" },
    ]);
  });

  test("roadmap copy preserves nested stage fallbacks", () => {
    const messages = mergeFeedbackMessages({
      roadmap: {
        title: "What is next",
        statuses: { shipped: "Released" },
      },
    });

    expect(messages.roadmap.title).toBe("What is next");
    expect(messages.roadmap.statuses.shipped).toBe("Released");
    expect(messages.roadmap.statuses.planned).toBe(
      englishFeedbackMessages.roadmap.statuses.planned,
    );
    expect(messages.roadmap.linkedEntries(2)).toBe("2 feedback items");
    expect(messages.roadmap.emptyStage).toBe(
      englishFeedbackMessages.roadmap.emptyStage,
    );
  });
});
