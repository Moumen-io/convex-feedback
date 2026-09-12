import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mergedStream, stream } from "convex-helpers/server/stream";

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
    const { status, priority, tagId } = args;
    const matches = (entry: Doc<"entries">) =>
      matchesFilters(entry, kinds, status, priority);
    const result =
      tagId !== undefined
        ? await mergedStream(
            [
              stream(ctx.db, schema)
                .query("entries")
                .withIndex("by_primary_tag_id", (q) =>
                  q.eq("primaryTagId", tagId),
                )
                .order("desc"),
              stream(ctx.db, schema)
                .query("entries")
                .withIndex("by_secondary_tag_id", (q) =>
                  q.eq("secondaryTagId", tagId),
                )
                .order("desc"),
            ],
            ["_creationTime"],
          )
            .filterWith((entry) => Promise.resolve(matches(entry)))
            .paginate(args.paginationOpts)
        : await (
            priority !== undefined
              ? stream(ctx.db, schema)
                  .query("entries")
                  .withIndex("by_priority", (q) => q.eq("priority", priority))
              : status !== undefined
                ? stream(ctx.db, schema)
                    .query("entries")
                    .withIndex("by_status", (q) => q.eq("status", status))
                : kinds?.length === 1
                  ? stream(ctx.db, schema)
                      .query("entries")
                      .withIndex("by_kind", (q) => q.eq("kind", kinds[0]!))
                  : stream(ctx.db, schema).query("entries")
          )
            .order("desc")
            .filterWith((entry) => Promise.resolve(matches(entry)))
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
    tagId: v.optional(v.id("tags")),
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
    const indexedKind = kinds?.length === 1 ? kinds[0] : undefined;
    const result = await ctx.db
      .query("entries")
      .withSearchIndex("search", (q) => {
        const searched = q.search("searchText", searchQuery);
        const withKind =
          indexedKind === undefined
            ? searched
            : searched.eq("kind", indexedKind);
        const withStatus =
          args.status === undefined
            ? withKind
            : withKind.eq("status", args.status);
        return args.priority === undefined
          ? withStatus
          : withStatus.eq("priority", args.priority);
      })
      .paginate(args.paginationOpts);
    const filtered = result.page.filter(
      (entry) =>
        matchesFilters(entry, kinds, args.status, args.priority) &&
        (args.tagId === undefined ||
          entry.primaryTagId === args.tagId ||
          entry.secondaryTagId === args.tagId),
    );
    return {
      ...result,
      page: await Promise.all(
        filtered.map((entry) =>
          serializeAdminEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});
