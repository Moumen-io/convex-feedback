import { stream } from "convex-helpers/server/stream";
import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationOptions,
  type PaginationResult,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel.js";
import { query } from "./_generated/server.js";
import { serializeAdminEntry } from "./helpers.js";
import {
  adminEntryValidator,
  entryKindValidator,
  entryPriorityValidator,
  entryStatusFilterValidator,
  entryStatusValidator,
  type EntryKind,
  type EntryPriority,
  type EntryStatus,
  type EntryStatusFilter,
} from "./model.js";
import schema from "./schema.js";

const ADMIN_SEARCH_CURSOR_PREFIX = "convex-feedback:admin-search:";

type TakeQuery<T> = {
  take(n: number): Promise<T[]>;
};

function encodeAdminSearchCursor(offset: number): string {
  return `${ADMIN_SEARCH_CURSOR_PREFIX}${offset}`;
}

function decodeAdminSearchCursor(cursor: string | null | undefined): number {
  if (cursor === null || cursor === undefined) return 0;
  if (!cursor.startsWith(ADMIN_SEARCH_CURSOR_PREFIX)) {
    throw new ConvexError("InvalidCursor: invalid admin search cursor.");
  }

  const offset = Number(cursor.slice(ADMIN_SEARCH_CURSOR_PREFIX.length));
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new ConvexError("InvalidCursor: invalid admin search cursor.");
  }
  return offset;
}

function addAdminSearchCursorOffsets(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new ConvexError("InvalidCursor: admin search cursor is too large.");
  }
  return result;
}

async function paginateAdminSearchIndex(
  query: TakeQuery<Doc<"entries">>,
  paginationOpts: PaginationOptions,
): Promise<PaginationResult<Doc<"entries">>> {
  const start = decodeAdminSearchCursor(paginationOpts.cursor);
  const end = decodeAdminSearchCursor(paginationOpts.endCursor);
  const requestedEnd =
    paginationOpts.endCursor === undefined || paginationOpts.endCursor === null
      ? addAdminSearchCursorOffsets(start, paginationOpts.numItems)
      : end;

  if (requestedEnd < start) {
    throw new ConvexError("InvalidCursor: admin search cursors are reversed.");
  }

  // Search-index queries cannot expose a component-safe continuation cursor.
  // Read through the requested range and use the result offset as our opaque
  // cursor instead.
  const results = await query.take(
    addAdminSearchCursorOffsets(requestedEnd, 1),
  );
  const page = results.slice(start, requestedEnd);
  const nextOffset = addAdminSearchCursorOffsets(start, page.length);

  return {
    page,
    isDone: results.length <= requestedEnd,
    continueCursor: encodeAdminSearchCursor(nextOffset),
  };
}

function matchesFilters(
  entry: Doc<"entries">,
  kinds: EntryKind[] | undefined,
  status: EntryStatus | undefined,
  statusFilter: EntryStatusFilter | undefined,
  priority: EntryPriority | undefined,
): boolean {
  return (
    entry.deletingAt === undefined &&
    (kinds === undefined || kinds.includes(entry.kind)) &&
    (status === undefined || entry.status === status) &&
    (statusFilter === undefined || entry.statusFilter === statusFilter) &&
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
    return entry === null || entry.deletingAt !== undefined
      ? null
      : await serializeAdminEntry(ctx, entry, args.viewerActorId);
  },
});

export const listEntries = query({
  args: {
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    statusFilter: v.optional(entryStatusFilterValidator),
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
    if (args.status !== undefined && args.statusFilter !== undefined) {
      throw new ConvexError(
        "`status` and `statusFilter` cannot be used together.",
      );
    }

    const entriesStream =
      args.statusFilter !== undefined
        ? kinds?.length === 1
          ? stream(ctx.db, schema)
              .query("entries")
              .withIndex("by_kind_status_filter", (q) =>
                q.eq("kind", kinds[0]!).eq("statusFilter", args.statusFilter!),
              )
          : stream(ctx.db, schema)
              .query("entries")
              .withIndex("by_status_filter", (q) =>
                q.eq("statusFilter", args.statusFilter!),
              )
        : args.priority !== undefined
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
          matchesFilters(
            entry,
            kinds,
            args.status,
            args.statusFilter,
            args.priority,
          ),
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
    statusFilter: v.optional(entryStatusFilterValidator),
    priority: v.optional(entryPriorityValidator),
    paginationOpts: paginationOptsValidator,
    viewerActorId: v.string(),
  },
  returns: paginationResultValidator(adminEntryValidator),
  handler: async (ctx, args) => {
    if (args.status !== undefined && args.statusFilter !== undefined) {
      throw new ConvexError(
        "`status` and `statusFilter` cannot be used together.",
      );
    }
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
      ? await paginateAdminSearchIndex(
          ctx.db.query("entries").withSearchIndex("search", (q) => {
            const searched = q.search("searchText", searchQuery);
            const withKind =
              kinds?.length === 1 ? searched.eq("kind", kinds[0]!) : searched;
            const withStatus =
              args.statusFilter === undefined
                ? args.status === undefined
                  ? withKind
                  : withKind.eq("status", args.status)
                : withKind.eq("statusFilter", args.statusFilter);
            const withPriority =
              args.priority === undefined
                ? withStatus
                : withStatus.eq("priority", args.priority);
            return withPriority.eq("deletingAt", undefined);
          }),
          args.paginationOpts,
        )
      : await (
          args.statusFilter !== undefined
            ? kinds?.length === 1
              ? stream(ctx.db, schema)
                  .query("entries")
                  .withIndex("by_kind_status_filter", (q) =>
                    q
                      .eq("kind", kinds[0]!)
                      .eq("statusFilter", args.statusFilter!),
                  )
              : stream(ctx.db, schema)
                  .query("entries")
                  .withIndex("by_status_filter", (q) =>
                    q.eq("statusFilter", args.statusFilter!),
                  )
            : args.priority !== undefined
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
              matchesFilters(
                entry,
                kinds,
                args.status,
                args.statusFilter,
                args.priority,
              ) && matchesSearch(entry, searchQuery),
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
