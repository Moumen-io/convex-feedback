import { cronJobs } from "convex/server";

import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Interval jobs run as soon as they are first deployed. The 30-day repeat is a
// temporary, low-frequency self-healing safeguard for missed legacy records.
crons.interval(
  "self-heal entry status filters",
  { hours: 24 * 30 },
  internal.migrations.backfillStatusFilter,
  {},
);

// Legacy comment tombstones and orphaned feedback are drained in bounded
// scheduled batches. The interval is a low-frequency retry for installations
// that upgrade while an earlier batch is paused or interrupted.
crons.interval(
  "clean up legacy comment tombstones",
  { hours: 24 * 30 },
  internal.migrations.cleanupLegacyComments,
  {},
);

export default crons;
