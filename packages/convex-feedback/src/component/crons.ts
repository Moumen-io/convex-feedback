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

export default crons;
