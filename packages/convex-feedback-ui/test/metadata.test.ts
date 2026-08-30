import { describe, expect, test, vi } from "vitest";

import {
  collectEntryMetadata,
  formatMetadataKey,
} from "../src/shared/metadata.js";

describe("metadata collection", () => {
  test("true collects platform defaults", async () => {
    const collector = vi.fn(() => ({ platform: "web" as const }));

    await expect(
      collectEntryMetadata(true, "feedback", collector),
    ).resolves.toEqual({ standard: { platform: "web" } });
    expect(collector).toHaveBeenCalledWith(true);
  });

  test("per-kind settings replace standard fields and merge additional values", async () => {
    const collector = vi.fn(() => ({ appVersion: "2.4.0" }));

    await expect(
      collectEntryMetadata(
        {
          standard: true,
          additional: { releaseChannel: "production", tier: "free" },
          kinds: {
            bug_report: {
              standard: ["appVersion"],
              additional: ({ kind }) => Promise.resolve({ kind, tier: "pro" }),
            },
          },
        },
        "bug_report",
        collector,
      ),
    ).resolves.toEqual({
      standard: { appVersion: "2.4.0" },
      additional: {
        releaseChannel: "production",
        kind: "bug_report",
        tier: "pro",
      },
    });
    expect(collector).toHaveBeenCalledWith(["appVersion"]);
  });

  test("a disabled kind collects nothing", async () => {
    const collector = vi.fn(() => ({ platform: "web" as const }));

    await expect(
      collectEntryMetadata(
        { standard: true, kinds: { feedback: false } },
        "feedback",
        collector,
      ),
    ).resolves.toBeUndefined();
    expect(collector).not.toHaveBeenCalled();
  });

  test("failed sources are omitted without blocking successful metadata", async () => {
    await expect(
      collectEntryMetadata(
        {
          standard: true,
          additional: () => Promise.reject(new Error("unavailable")),
        },
        "feedback",
        () => ({ platform: "web" }),
      ),
    ).resolves.toEqual({ standard: { platform: "web" } });
  });

  test("formats metadata keys for display", () => {
    expect(formatMetadataKey("expoRuntimeVersion")).toBe(
      "Expo Runtime Version",
    );
    expect(formatMetadataKey("release_channel")).toBe("Release channel");
  });
});
