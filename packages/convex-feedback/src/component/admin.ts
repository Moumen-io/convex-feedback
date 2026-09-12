import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { stream } from "convex-helpers/server/stream";

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
import schema from "./schema.js";

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

function matchesSearch(entry: Doc<"entries">, searchQuery: string): boolean {
  const haystack = entry.searchText.toLocaleLowerCase("en-US");
  const terms = searchQuery
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter((term) => term.length > 0);
  return terms.every((term) => haystack.includes(term));
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
    paginationOpts: paginationOptsValidator,
    viewerActorId: v.string(),
  },
  returns: paginationResultValidator(adminEntryValidator),
  handler: async (ctx, args) => {
    const kinds =
      args.kinds === undefined ? undefined : [...new Set(args.kinds)];
    if (kinds?.length === 0) {
      throw new ConvexError("`kinds` must contain at least one kind.");
    }

    const entriesStream =
      args.priority !== undefined
        ? stream(ctx.db, schema)
            .query("entries")
            .withIndex("by_priority", (q) => q.eq("priority", args.priority))
        : args.status !== undefined
          ? stream(ctx.db, schema)
              .query("entries")
              .withIndex("by_status", (q) => q.eq("status", args.status!))
          : kinds?.length === 1
            ? stream(ctx.db, schema)
                .query("entries")
                .withIndex("by_kind", (q) => q.eq("kind", kinds[0]!))
            : stream(ctx.db, schema).query("entries");

    const result = await entriesStream
      .order("desc")
      .filterWith((entry) =>
        Promise.resolve(
          matchesFilters(entry, kinds, args.status, args.priority),
        ),
      )
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((entry) =>
          serializeAdminEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});

export const searchEntries = query({
  args: {
    searchQuery: v.string(),
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    priority: v.optional(entryPriorityValidator),
    paginationOpts: paginationOptsValidator,
    viewerActorId: v.string(),
  },
  returns: paginationResultValidator(adminEntryValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();
    if (searchQuery.length === 0) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const kinds =
      args.kinds === undefined ? undefined : [...new Set(args.kinds)];
    if (kinds?.length === 0) {
      throw new ConvexError("`kinds` must contain at least one kind.");
    }

    const canUseSearchIndex = kinds === undefined || kinds.length === 1;

    const result = canUseSearchIndex
      ? await ctx.db
          .query("entries")
          .withSearchIndex("search", (q) => {
            const searched = q.search("searchText", searchQuery);
            const withKind =
              kinds?.length === 1 ? searched.eq("kind", kinds[0]!) : searched;
            const withStatus =
              args.status === undefined
                ? withKind
                : withKind.eq("status", args.status);
            return args.priority === undefined
              ? withStatus
              : withStatus.eq("priority", args.priority);
          })
          .paginate(args.paginationOpts)
      : await (
          args.priority !== undefined
            ? stream(ctx.db, schema)
                .query("entries")
                .withIndex("by_priority", (q) =>
                  q.eq("priority", args.priority),
                )
            : args.status !== undefined
              ? stream(ctx.db, schema)
                  .query("entries")
                  .withIndex("by_status", (q) => q.eq("status", args.status!))
              : kinds?.length === 1
                ? stream(ctx.db, schema)
                    .query("entries")
                    .withIndex("by_kind", (q) => q.eq("kind", kinds[0]!))
                : stream(ctx.db, schema).query("entries")
        )
          .order("desc")
          .filterWith((entry) =>
            Promise.resolve(
              matchesFilters(entry, kinds, args.status, args.priority) &&
                matchesSearch(entry, searchQuery),
            ),
          )
          .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((entry) =>
          serializeAdminEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});
