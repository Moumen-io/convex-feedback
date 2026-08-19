import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationResult,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { mergedStream, stream } from "convex-helpers/server/stream";
import type { Doc } from "./_generated/dataModel.js";
import { mutation, query } from "./_generated/server.js";
import {
  assertActorId,
  normalizeRequiredText,
  normalizeTitle,
  serializeEntry,
} from "./helpers.js";
import {
  actorValidator,
  entryKindValidator,
  entrySortValidator,
  entryStatusValidator,
  publicEntryValidator,
  similarEntriesValidator,
  type EntryKind,
} from "./model.js";
import schema from "./schema.js";

const allEntryKinds: readonly EntryKind[] = [
  "feedback",
  "feature_request",
  "bug_report",
];

function normalizeKindFilter(
  kinds: readonly EntryKind[] | undefined,
): EntryKind[] | undefined {
  if (kinds === undefined) {
    return undefined;
  }

  const uniqueKinds = [...new Set(kinds)];

  if (uniqueKinds.length === 0) {
    throw new ConvexError(
      "`kinds` must contain at least one entry kind when provided.",
    );
  }

  // All known kinds is equivalent to no kind filter and lets us use the
  // simpler global indexes.
  if (uniqueKinds.length === allEntryKinds.length) {
    return undefined;
  }

  return uniqueKinds;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    sort: entrySortValidator,
    viewerActorId: v.optional(v.string()),
  },
  returns: paginationResultValidator(publicEntryValidator),
  handler: async (ctx, args) => {
    const db = paginator(ctx.db, schema);
    const kinds = normalizeKindFilter(args.kinds);
    const { status } = args;

    let result: PaginationResult<Doc<"entries">>;

    if (kinds === undefined) {
      result =
        args.sort === "top"
          ? status === undefined
            ? await db
                .query("entries")
                .withIndex("by_upvotes")
                .order("desc")
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_status_upvotes", (q) => q.eq("status", status))
                .order("desc")
                .paginate(args.paginationOpts)
          : status === undefined
            ? await db
                .query("entries")
                .order("desc")
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_status", (q) => q.eq("status", status))
                .order("desc")
                .paginate(args.paginationOpts);
    } else if (kinds.length === 1) {
      const kind = kinds[0];

      if (kind === undefined) {
        throw new ConvexError("Invalid kind filter.");
      }

      result =
        args.sort === "top"
          ? status === undefined
            ? await db
                .query("entries")
                .withIndex("by_kind_upvotes", (q) => q.eq("kind", kind))
                .order("desc")
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_kind_status_upvotes", (q) =>
                  q.eq("kind", kind).eq("status", status),
                )
                .order("desc")
                .paginate(args.paginationOpts)
          : status === undefined
            ? await db
                .query("entries")
                .withIndex("by_kind", (q) => q.eq("kind", kind))
                .order("desc")
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_kind_status", (q) =>
                  q.eq("kind", kind).eq("status", status),
                )
                .order("desc")
                .paginate(args.paginationOpts);
    } else if (args.sort === "top") {
      if (status === undefined) {
        const streams = kinds.map((kind) =>
          stream(ctx.db, schema)
            .query("entries")
            .withIndex("by_kind_upvotes", (q) => q.eq("kind", kind))
            .order("desc"),
        );

        result = await mergedStream(streams, [
          "upvoteCount",
          "_creationTime",
        ]).paginate(args.paginationOpts);
      } else {
        const streams = kinds.map((kind) =>
          stream(ctx.db, schema)
            .query("entries")
            .withIndex("by_kind_status_upvotes", (q) =>
              q.eq("kind", kind).eq("status", status),
            )
            .order("desc"),
        );

        result = await mergedStream(streams, [
          "upvoteCount",
          "_creationTime",
        ]).paginate(args.paginationOpts);
      }
    } else if (status === undefined) {
      const streams = kinds.map((kind) =>
        stream(ctx.db, schema)
          .query("entries")
          .withIndex("by_kind", (q) => q.eq("kind", kind))
          .order("desc"),
      );

      result = await mergedStream(streams, ["_creationTime"]).paginate(
        args.paginationOpts,
      );
    } else {
      const streams = kinds.map((kind) =>
        stream(ctx.db, schema)
          .query("entries")
          .withIndex("by_kind_status", (q) =>
            q.eq("kind", kind).eq("status", status),
          )
          .order("desc"),
      );

      result = await mergedStream(streams, ["_creationTime"]).paginate(
        args.paginationOpts,
      );
    }

    return {
      ...result,
      page: await Promise.all(
        result.page.map((entry) =>
          serializeEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});

export const get = query({
  args: {
    entryId: v.string(),
    viewerActorId: v.optional(v.string()),
  },
  returns: v.union(publicEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const entryId = ctx.db.normalizeId("entries", args.entryId);
    if (entryId === null) return null;
    const entry = await ctx.db.get("entries", entryId);
    return entry === null
      ? null
      : serializeEntry(ctx, entry, args.viewerActorId);
  },
});

export const search = query({
  args: {
    searchQuery: v.string(),
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    limit: v.number(),
    viewerActorId: v.optional(v.string()),
  },
  returns: v.array(publicEntryValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();

    if (searchQuery.length === 0 || args.limit <= 0) {
      return [];
    }

    const kinds = normalizeKindFilter(args.kinds);
    const { status } = args;

    let entries: Doc<"entries">[];

    if (kinds === undefined) {
      entries =
        status === undefined
          ? await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery),
              )
              .take(args.limit)
          : await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery).eq("status", status),
              )
              .take(args.limit);
    } else if (kinds.length === 1) {
      const kind = kinds[0];

      if (kind === undefined) {
        throw new ConvexError("Invalid kind filter.");
      }

      entries =
        status === undefined
          ? await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery).eq("kind", kind),
              )
              .take(args.limit)
          : await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q
                  .search("searchText", searchQuery)
                  .eq("kind", kind)
                  .eq("status", status),
              )
              .take(args.limit);
    } else {
      const firstKind = kinds[0];
      const secondKind = kinds[1];

      if (firstKind === undefined || secondKind === undefined) {
        throw new ConvexError("Invalid kind filter.");
      }

      const searchResults =
        status === undefined
          ? ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery),
              )
          : ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery).eq("status", status),
              );

      entries = await searchResults
        // eslint-disable-next-line @convex-dev/no-filter-in-query
        .filter((q) =>
          q.or(
            q.eq(q.field("kind"), firstKind),
            q.eq(q.field("kind"), secondKind),
          ),
        )
        .take(args.limit);
    }

    return await Promise.all(
      entries.map((entry) => serializeEntry(ctx, entry, args.viewerActorId)),
    );
  },
});

export const similar = query({
  args: {
    title: v.string(),
    body: v.string(),
    kind: v.optional(entryKindValidator),
    limit: v.number(),
    viewerActorId: v.optional(v.string()),
  },
  returns: similarEntriesValidator,
  handler: async (ctx, args) => {
    if (args.limit <= 0) {
      return {
        exact: [],
        similar: [],
      };
    }

    const title = args.title.trim();
    const body = args.body.trim();
    const kind = args.kind;

    if (title.length === 0 && body.length === 0) {
      return {
        exact: [],
        similar: [],
      };
    }

    const normalizedTitle = normalizeTitle(title);

    // Exact normalized-title matches always consume the available limit first.
    const exactDocs =
      title.length === 0
        ? []
        : kind === undefined
          ? await ctx.db
              .query("entries")
              .withIndex("by_normalized_title", (q) =>
                q.eq("normalizedTitle", normalizedTitle),
              )
              .take(args.limit)
          : await ctx.db
              .query("entries")
              .withIndex("by_kind_normalized_title", (q) =>
                q.eq("kind", kind).eq("normalizedTitle", normalizedTitle),
              )
              .take(args.limit);

    const exact = await Promise.all(
      exactDocs.map((entry) => serializeEntry(ctx, entry, args.viewerActorId)),
    );

    const remainingLimit = args.limit - exactDocs.length;

    if (remainingLimit <= 0) {
      return {
        exact,
        similar: [],
      };
    }

    const searchText = `${title}\n${body}`.trim();

    if (searchText.length === 0) {
      return {
        exact,
        similar: [],
      };
    }

    const exactIds = new Set(exactDocs.map((entry) => entry._id));

    // We fetch enough candidates to account for exact matches also appearing
    // in the full-text search results. Those duplicates are removed below.
    const candidateLimit = remainingLimit + exactIds.size;

    const similarDocs =
      kind === undefined
        ? await ctx.db
            .query("entries")
            .withSearchIndex("search", (q) =>
              q.search("searchText", searchText),
            )
            .take(candidateLimit)
        : await ctx.db
            .query("entries")
            .withSearchIndex("search", (q) =>
              q.search("searchText", searchText).eq("kind", kind),
            )
            .take(candidateLimit);

    const similarDocsWithoutExactMatches = similarDocs
      .filter((entry) => !exactIds.has(entry._id))
      .slice(0, remainingLimit);

    return {
      exact,
      similar: await Promise.all(
        similarDocsWithoutExactMatches.map((entry) =>
          serializeEntry(ctx, entry, args.viewerActorId),
        ),
      ),
    };
  },
});

export const create = mutation({
  args: {
    actorId: v.string(),
    kind: entryKindValidator,
    title: v.string(),
    body: v.string(),
    defaultStatus: entryStatusValidator,
    enabledKinds: v.array(entryKindValidator),
    maxTitleLength: v.number(),
    maxBodyLength: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    if (!args.enabledKinds.includes(args.kind)) {
      throw new ConvexError(`Entry kind '${args.kind}' is disabled.`);
    }

    const title = normalizeRequiredText(
      args.title,
      "Title",
      args.maxTitleLength,
    );
    const body = normalizeRequiredText(args.body, "Body", args.maxBodyLength);

    const entry = await ctx.db.insert("entries", {
      actorId: args.actorId,
      kind: args.kind,
      status: args.defaultStatus,
      title,
      body,
      normalizedTitle: normalizeTitle(title),
      searchText: `${title}\n${body}`,
      upvoteCount: 1,
      commentCount: 0,
    });

    await ctx.db.insert("reactions", {
      actorId: args.actorId,
      entryId: entry,
    });

    return entry;
  },
});

export const update = mutation({
  args: {
    actor: actorValidator,
    entryId: v.string(),
    title: v.string(),
    body: v.string(),
    editableByAuthor: v.boolean(),
    maxTitleLength: v.number(),
    maxBodyLength: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertActorId(args.actor.id);
    const entryId = ctx.db.normalizeId("entries", args.entryId);
    if (entryId === null) throw new ConvexError("Entry not found.");
    const entry = await ctx.db.get("entries", entryId);
    if (entry === null) throw new ConvexError("Entry not found.");

    const canEdit =
      args.actor.isModerator ||
      (args.editableByAuthor && entry.actorId === args.actor.id);
    if (!canEdit) throw new ConvexError("Not authorized to edit this entry.");

    const title = normalizeRequiredText(
      args.title,
      "Title",
      args.maxTitleLength,
    );
    const body = normalizeRequiredText(args.body, "Body", args.maxBodyLength);

    await ctx.db.patch("entries", entryId, {
      title,
      body,
      normalizedTitle: normalizeTitle(title),
      searchText: `${title}\n${body}`,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setStatus = mutation({
  args: {
    actor: actorValidator,
    entryId: v.string(),
    status: entryStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.actor.isModerator) {
      throw new ConvexError("Moderator access is required to change status.");
    }
    const entryId = ctx.db.normalizeId("entries", args.entryId);
    if (entryId === null || (await ctx.db.get("entries", entryId)) === null) {
      throw new ConvexError("Entry not found.");
    }
    await ctx.db.patch("entries", entryId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setUpvote = mutation({
  args: {
    actorId: v.string(),
    entryId: v.string(),
    desiredState: v.boolean(),
  },
  returns: v.object({ active: v.boolean(), upvoteCount: v.number() }),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    const entryId = ctx.db.normalizeId("entries", args.entryId);
    if (entryId === null) throw new ConvexError("Entry not found.");
    const entry = await ctx.db.get("entries", entryId);
    if (entry === null) throw new ConvexError("Entry not found.");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_entry_actor", (q) =>
        q.eq("entryId", entryId).eq("actorId", args.actorId),
      )
      .unique();

    if (args.desiredState && existing === null) {
      await ctx.db.insert("reactions", { actorId: args.actorId, entryId });
      const upvoteCount = entry.upvoteCount + 1;
      await ctx.db.patch("entries", entryId, { upvoteCount });
      return { active: true, upvoteCount };
    }

    if (!args.desiredState && existing !== null) {
      await ctx.db.delete("reactions", existing._id);
      const upvoteCount = Math.max(0, entry.upvoteCount - 1);
      await ctx.db.patch("entries", entryId, { upvoteCount });
      return { active: false, upvoteCount };
    }

    return { active: args.desiredState, upvoteCount: entry.upvoteCount };
  },
});
