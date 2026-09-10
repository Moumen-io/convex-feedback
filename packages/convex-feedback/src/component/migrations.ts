import { v } from "convex/values";

import { internal } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";
import { entryStatusFilterForStatus } from "./model.js";

const statusFilterMigrationBatchSize = 100;

/**
 * Backfills one bounded batch of legacy entries and schedules the next batch.
 *
 * The indexed undefined lookup and deterministic status mapping make this
 * safe to run concurrently, retry, or invoke again after completion.
 */
export const backfillStatusFilter = internalMutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_status_filter", (q) => q.eq("statusFilter", undefined))
      .take(statusFilterMigrationBatchSize);

    for (const entry of entries) {
      await ctx.db.patch("entries", entry._id, {
        statusFilter: entryStatusFilterForStatus(entry.status),
      });
    }

    const hasMore = entries.length === statusFilterMigrationBatchSize;
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillStatusFilter,
        {},
      );
    }

    return { updated: entries.length, hasMore };
  },
});
