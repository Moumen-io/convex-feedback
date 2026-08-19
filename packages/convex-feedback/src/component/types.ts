import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";

import type { DataModel } from "./_generated/dataModel.js";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
