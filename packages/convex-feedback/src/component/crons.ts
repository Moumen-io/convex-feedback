import { cronJobs } from "convex/server";

import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Interval jobs run as soon as they are first deployed. The very long repeat
// interval makes this an automatic, effectively one-time upgrade migration.
crons.interval(
  "bootstrap entry status filters",
  { hours: 24 * 365 * 100 },
  internal.migrations.backfillStatusFilter,
  {},
);

// Temporary safeguard for missed or legacy records. Remove after supported
// installations have had sufficient time to receive and run the migration.
crons.monthly(
  "self-heal entry status filters",
  { day: 1, hourUTC: 3 },
  internal.migrations.backfillStatusFilter,
  {},
);

export default crons;
