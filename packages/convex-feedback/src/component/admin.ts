import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel.js";
import { query } from "./_generated/server.js";
import { serializeAdminEntry } from "./helpers.js";
import {
  adminEntryValidator,
  entryKindValidator,
  entryPriorityValidator,
  entryStatusValidator,
  type EntryKind,
  type EntryPriority,
  type EntryStatus,
} from "./model.js";

function matchesFilters(
  entry: Doc<"entries">,
  kinds: EntryKind[] | undefined,
  status: EntryStatus | undefined,
  priority: EntryPriority | undefined,
): boolean {
  return (
    (kinds === undefined || kinds.includes(entry.kind)) &&
    (status === undefined || entry.status === status) &&
    (priority === undefined || entry.priority === priority)
  );
}

export const getEntry = query({
  args: { entryId: v.id("entries"), viewerActorId: v.string() },
  returns: v.union(adminEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    return entry === null
      ? null
      : await serializeAdminEntry(ctx, entry, args.viewerActorId);
  },
});

export const listEntries = query({
  args: {
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    priority: v.optional(entryPriorityValidator),
    tagId: v.optional(v.id("tags")),
    limit: v.number(),
    viewerActorId: v.string(),
  },
  returns: v.array(adminEntryValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit), 1), 100);
    const kinds =
      args.kinds === undefined ? undefined : [...new Set(args.kinds)];
    if (kinds?.length === 0) {
      throw new ConvexError("`kinds` must contain at least one kind.");
    }
    let entries: Doc<"entries">[];

    if (args.tagId !== undefined) {
      const predicate = (entry: Doc<"entries">) =>
        matchesFilters(entry, kinds, args.status, args.priority);
      const [primary, secondary] = await Promise.all([
        ctx.db
          .query("entries")
          .withIndex("by_primary_tag_id", (q) =>
            q.eq("primaryTagId", args.tagId),
          )
          .order("desc")
          .take(limit * 4),
        ctx.db
          .query("entries")
          .withIndex("by_secondary_tag_id", (q) =>
            q.eq("secondaryTagId", args.tagId),
          )
          .order("desc")
          .take(limit * 4),
      ]);
      entries = [...primary, ...secondary]
        .filter(predicate)
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, limit);
    } else {
      const status = args.status;
      const base =
        args.priority !== undefined
          ? ctx.db
              .query("entries")
              .withIndex("by_priority", (q) => q.eq("priority", args.priority))
          : status !== undefined
            ? ctx.db
                .query("entries")
                .withIndex("by_status", (q) => q.eq("status", status))
            : kinds?.length === 1
              ? ctx.db
                  .query("entries")
                  .withIndex("by_kind", (q) => q.eq("kind", kinds[0]!))
              : ctx.db.query("entries");
      entries = await base.order("desc").take(limit * 4);
      entries = entries
        .filter((entry) =>
          matchesFilters(entry, kinds, args.status, args.priority),
        )
        .slice(0, limit);
    }

    return await Promise.all(
      entries.map((entry) =>
        serializeAdminEntry(ctx, entry, args.viewerActorId),
      ),
    );
  },
});

export const searchEntries = query({
  args: {
    searchQuery: v.string(),
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    priority: v.optional(entryPriorityValidator),
    tagId: v.optional(v.id("tags")),
    limit: v.number(),
    viewerActorId: v.string(),
  },
  returns: v.array(adminEntryValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();
    if (searchQuery.length === 0 || args.limit <= 0) return [];
    const limit = Math.min(Math.floor(args.limit), 100);
    const kinds =
      args.kinds === undefined ? undefined : [...new Set(args.kinds)];
    const entries = await ctx.db
      .query("entries")
      .withSearchIndex("search", (q) => q.search("searchText", searchQuery))
      .take(limit * 3);
    const filtered = entries
      .filter(
        (entry) =>
          matchesFilters(entry, kinds, args.status, args.priority) &&
          (args.tagId === undefined ||
            entry.primaryTagId === args.tagId ||
            entry.secondaryTagId === args.tagId),
      )
      .slice(0, limit);
    return await Promise.all(
      filtered.map((entry) =>
        serializeAdminEntry(ctx, entry, args.viewerActorId),
      ),
    );
  },
});
