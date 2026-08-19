import { describe, expect, test } from "vitest";

import { createFeedbackConfig } from "../src/client/config.js";
import { normalizeTitle } from "../src/component/helpers.js";

describe("configuration", () => {
  test("deep-merges layer overrides without losing defaults", () => {
    const config = createFeedbackConfig({ comments: { maxDepth: 8 } });
    expect(config.comments.maxDepth).toBe(8);
    expect(config.comments.defaultSort).toBe("top");
    expect(config.entries.defaultStatus).toBe("open");
  });

  test("normalizes duplicate titles consistently", () => {
    expect(normalizeTitle("  A   Better\nSearch ")).toBe("a better search");
  });
});
