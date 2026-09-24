import { describe, expect, it } from "vitest";
import { getFunctionName } from "convex/server";

import {
  testConvexAdminConnection,
  type ConvexAdminConnectionQuery,
} from "../src/convex.js";

describe("runtime Convex connection checks", () => {
  it("calls the configured api namespace and accepts an unauthenticated false", async () => {
    const calls: string[] = [];
    const query: ConvexAdminConnectionQuery = (reference, args) => {
      calls.push(`${getFunctionName(reference)}:${JSON.stringify(args)}`);
      return Promise.resolve(false);
    };

    await expect(
      testConvexAdminConnection(
        {
          convexUrl: "https://example.convex.cloud/",
          apiNamespace: "api.feedback.admin",
        },
        query,
      ),
    ).resolves.toEqual({
      ok: true,
      apiPath: "api.feedback.admin.isAdmin",
      isAdmin: false,
    });
    expect(calls).toEqual(["feedback/admin:isAdmin:{}"]);
  });

  it("rejects malformed connection input before making a request", async () => {
    let called = false;
    const query: ConvexAdminConnectionQuery = () => {
      called = true;
      return Promise.resolve(false);
    };

    await expect(
      testConvexAdminConnection(
        {
          convexUrl: "https://example.convex.cloud/dashboard",
          apiNamespace: "feedback",
        },
        query,
      ),
    ).resolves.toMatchObject({
      ok: false,
      stage: "configuration",
    });
    expect(called).toBe(false);
  });

  it("explains endpoint failures separately from network failures", async () => {
    const endpointFailure: ConvexAdminConnectionQuery = () =>
      Promise.reject(
        new Error("Could not find public function feedback:isAdmin"),
      );
    const networkFailure: ConvexAdminConnectionQuery = () =>
      Promise.reject(new Error("Network request failed"));

    await expect(
      testConvexAdminConnection(
        { convexUrl: "https://example.convex.cloud", apiNamespace: "feedback" },
        endpointFailure,
      ),
    ).resolves.toEqual({
      ok: false,
      stage: "endpoint",
      error:
        "Convex responded, but api.feedback.isAdmin could not be called. Export the complete feedback API from that namespace and deploy it. Could not find public function feedback:isAdmin",
    });
    await expect(
      testConvexAdminConnection(
        { convexUrl: "https://example.convex.cloud", apiNamespace: "feedback" },
        networkFailure,
      ),
    ).resolves.toEqual({
      ok: false,
      stage: "deployment",
      error:
        "Could not reach the Convex deployment at https://example.convex.cloud. Check the URL and your network connection. Network request failed",
    });
  });
});
