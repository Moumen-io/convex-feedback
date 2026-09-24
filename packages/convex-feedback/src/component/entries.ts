import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationResult,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { mergedStream, stream } from "convex-helpers/server/stream";
import type { Doc } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";
import { internalMutation, mutation, query } from "./_generated/server.js";
import {
  assertActorId,
  normalizeRequiredText,
  normalizeTitle,
  serializeActivityEntry,
  serializeEntry,
  validateFeedbackMetadata,
} from "./helpers.js";
import {
  activityEntryWithContextValidator,
  actorValidator,
  actorIsAdmin,
  entryKindValidator,
  entryPriorityValidator,
  entrySortValidator,
  entryStatusFilterForStatus,
  entryStatusFilterValidator,
  entryStatusValidator,
  feedbackMetadataValidator,
  publicEntryValidator,
  similarEntriesValidator,
  type EntryKind,
} from "./model.js";
import schema from "./schema.js";
import type { MutationCtx } from "./types.js";

const allEntryKinds: readonly EntryKind[] = [
  "feedback",
  "feature_request",
  "bug_report",
];

/**
 * Cleanup deliberately uses small bounded batches. A comment may have more
 * reactions than this limit, so its reactions are drained over multiple
 * scheduled transactions before the comment itself is removed.
 */
const deletionBatchSize = 100;
const commentDeletionBatchSize = 25;
const reactionDeletionBatchSize = 100;

function entryIsLive(entry: Doc<"entries">): Promise<boolean> {
  return Promise.resolve(entry.deletingAt === undefined);
}

async function scheduleEntryCleanup(
  ctx: MutationCtx,
  entryId: Doc<"entries">["_id"],
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.entries.removeBatch, { entryId });
}

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
    statusFilter: v.optional(entryStatusFilterValidator),
    sort: entrySortValidator,
    viewerActorId: v.optional(v.string()),
  },
  returns: paginationResultValidator(publicEntryValidator),
  handler: async (ctx, args) => {
    const db = paginator(ctx.db, schema);
    const kinds = normalizeKindFilter(args.kinds);
    const { status, statusFilter } = args;

    if (status !== undefined && statusFilter !== undefined) {
      throw new ConvexError(
        "`status` and `statusFilter` cannot be used together.",
      );
    }

    let result: PaginationResult<Doc<"entries">>;

    if (statusFilter !== undefined) {
      if (kinds === undefined) {
        result =
          args.sort === "top"
            ? await db
                .query("entries")
                .withIndex("by_status_filter_upvotes", (q) =>
                  q.eq("statusFilter", statusFilter),
                )
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_status_filter", (q) =>
                  q.eq("statusFilter", statusFilter),
                )
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts);
      } else if (kinds.length === 1) {
        const kind = kinds[0];

        if (kind === undefined) {
          throw new ConvexError("Invalid kind filter.");
        }

        result =
          args.sort === "top"
            ? await db
                .query("entries")
                .withIndex("by_kind_status_filter_upvotes", (q) =>
                  q.eq("kind", kind).eq("statusFilter", statusFilter),
                )
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_kind_status_filter", (q) =>
                  q.eq("kind", kind).eq("statusFilter", statusFilter),
                )
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts);
      } else {
        const streams = kinds.map((kind) =>
          args.sort === "top"
            ? stream(ctx.db, schema)
                .query("entries")
                .withIndex("by_kind_status_filter_upvotes", (q) =>
                  q.eq("kind", kind).eq("statusFilter", statusFilter),
                )
                .order("desc")
                .filterWith(entryIsLive)
            : stream(ctx.db, schema)
                .query("entries")
                .withIndex("by_kind_status_filter", (q) =>
                  q.eq("kind", kind).eq("statusFilter", statusFilter),
                )
                .order("desc")
                .filterWith(entryIsLive),
        );

        result = await mergedStream(
          streams,
          args.sort === "top"
            ? ["upvoteCount", "_creationTime"]
            : ["_creationTime"],
        ).paginate(args.paginationOpts);
      }
    } else if (kinds === undefined) {
      result =
        args.sort === "top"
          ? status === undefined
            ? await db
                .query("entries")
                .withIndex("by_upvotes")
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_status_upvotes", (q) => q.eq("status", status))
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
          : status === undefined
            ? await db
                .query("entries")
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_status", (q) => q.eq("status", status))
                .order("desc")
                .filterWith(entryIsLive)
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
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_kind_status_upvotes", (q) =>
                  q.eq("kind", kind).eq("status", status),
                )
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
          : status === undefined
            ? await db
                .query("entries")
                .withIndex("by_kind", (q) => q.eq("kind", kind))
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts)
            : await db
                .query("entries")
                .withIndex("by_kind_status", (q) =>
                  q.eq("kind", kind).eq("status", status),
                )
                .order("desc")
                .filterWith(entryIsLive)
                .paginate(args.paginationOpts);
    } else if (args.sort === "top") {
      if (status === undefined) {
        const streams = kinds.map((kind) =>
          stream(ctx.db, schema)
            .query("entries")
            .withIndex("by_kind_upvotes", (q) => q.eq("kind", kind))
            .order("desc")
            .filterWith(entryIsLive),
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
            .order("desc")
            .filterWith(entryIsLive),
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
          .order("desc")
          .filterWith(entryIsLive),
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
          .order("desc")
          .filterWith(entryIsLive),
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

/**
 * List entries created by a known actor. This component-level query remains
 * actor-parameterized so trusted host/server consumers can use it without a
 * request authentication context.
 *
 * `includeAdminContext` is intentionally unavailable on the host-facing
 * `listUserEntries` wrapper. Trusted server consumers such as exports may opt
 * into retained metadata and triage context when needed.
 */
export const listByActor = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorId: v.string(),
    includeAdminContext: v.optional(v.boolean()),
  },
  returns: paginationResultValidator(activityEntryWithContextValidator),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);

    const result = await stream(ctx.db, schema)
      .query("entries")
      .withIndex("by_actor", (q) => q.eq("actorId", args.actorId))
      .order("desc")
      .filterWith(entryIsLive)
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((entry) =>
          serializeActivityEntry(ctx, entry, args.includeAdminContext === true),
        ),
      ),
    };
  },
});

export const get = query({
  args: {
    entryId: v.id("entries"),
    viewerActorId: v.optional(v.string()),
    viewerIsAdmin: v.optional(v.boolean()),
  },
  returns: v.union(publicEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    return entry === null || entry.deletingAt !== undefined
      ? null
      : serializeEntry(
          ctx,
          entry,
          args.viewerActorId,
          args.viewerIsAdmin === true,
        );
  },
});

export const search = query({
  args: {
    searchQuery: v.string(),
    kinds: v.optional(v.array(entryKindValidator)),
    status: v.optional(entryStatusValidator),
    statusFilter: v.optional(entryStatusFilterValidator),
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
    const { status, statusFilter } = args;

    if (status !== undefined && statusFilter !== undefined) {
      throw new ConvexError(
        "`status` and `statusFilter` cannot be used together.",
      );
    }

    let entries: Doc<"entries">[];

    if (statusFilter !== undefined) {
      if (kinds === undefined) {
        entries = await ctx.db
          .query("entries")
          .withSearchIndex("search", (q) =>
            q
              .search("searchText", searchQuery)
              .eq("statusFilter", statusFilter)
              .eq("deletingAt", undefined),
          )
          .take(args.limit);
      } else if (kinds.length === 1) {
        const kind = kinds[0];

        if (kind === undefined) {
          throw new ConvexError("Invalid kind filter.");
        }

        entries = await ctx.db
          .query("entries")
          .withSearchIndex("search", (q) =>
            q
              .search("searchText", searchQuery)
              .eq("kind", kind)
              .eq("statusFilter", statusFilter)
              .eq("deletingAt", undefined),
          )
          .take(args.limit);
      } else {
        const firstKind = kinds[0];
        const secondKind = kinds[1];

        if (firstKind === undefined || secondKind === undefined) {
          throw new ConvexError("Invalid kind filter.");
        }

        entries = await ctx.db
          .query("entries")
          .withSearchIndex("search", (q) =>
            q
              .search("searchText", searchQuery)
              .eq("statusFilter", statusFilter)
              .eq("deletingAt", undefined),
          )
          // eslint-disable-next-line @convex-dev/no-filter-in-query
          .filter((q) =>
            q.or(
              q.eq(q.field("kind"), firstKind),
              q.eq(q.field("kind"), secondKind),
            ),
          )
          .take(args.limit);
      }
    } else if (kinds === undefined) {
      entries =
        status === undefined
          ? await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery).eq("deletingAt", undefined),
              )
              .take(args.limit)
          : await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q
                  .search("searchText", searchQuery)
                  .eq("status", status)
                  .eq("deletingAt", undefined),
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
                q
                  .search("searchText", searchQuery)
                  .eq("kind", kind)
                  .eq("deletingAt", undefined),
              )
              .take(args.limit)
          : await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q
                  .search("searchText", searchQuery)
                  .eq("kind", kind)
                  .eq("status", status)
                  .eq("deletingAt", undefined),
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
                q.search("searchText", searchQuery).eq("deletingAt", undefined),
              )
          : ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q
                  .search("searchText", searchQuery)
                  .eq("status", status)
                  .eq("deletingAt", undefined),
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
      entries
        .filter((entry) => entry.deletingAt === undefined)
        .map((entry) => serializeEntry(ctx, entry, args.viewerActorId)),
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
              // The deletion flag is not part of this exact-match index.
              // Filter before take so pending entries cannot consume a slot.
              // eslint-disable-next-line @convex-dev/no-filter-in-query
              .filter((q) => q.eq(q.field("deletingAt"), undefined))
              .take(args.limit)
          : await ctx.db
              .query("entries")
              .withIndex("by_kind_normalized_title", (q) =>
                q.eq("kind", kind).eq("normalizedTitle", normalizedTitle),
              )
              // eslint-disable-next-line @convex-dev/no-filter-in-query
              .filter((q) => q.eq(q.field("deletingAt"), undefined))
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
              q.search("searchText", searchText).eq("deletingAt", undefined),
            )
            .take(candidateLimit)
        : await ctx.db
            .query("entries")
            .withSearchIndex("search", (q) =>
              q
                .search("searchText", searchText)
                .eq("kind", kind)
                .eq("deletingAt", undefined),
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
    metadata: v.optional(feedbackMetadataValidator),
    includeCallbackContext: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({ id: v.id("entries") }),
    v.object({
      id: v.id("entries"),
      entry: v.object({
        id: v.id("entries"),
        actorId: v.string(),
        kind: entryKindValidator,
        status: entryStatusValidator,
        title: v.string(),
        body: v.string(),
        metadata: v.optional(feedbackMetadataValidator),
        upvoteCount: v.number(),
        commentCount: v.number(),
      }),
    }),
  ),
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
    validateFeedbackMetadata(args.metadata);

    const entry = await ctx.db.insert("entries", {
      actorId: args.actorId,
      kind: args.kind,
      status: args.defaultStatus,
      statusFilter: entryStatusFilterForStatus(args.defaultStatus),
      title,
      body,
      normalizedTitle: normalizeTitle(title),
      searchText: `${title}\n${body}`,
      upvoteCount: 1,
      commentCount: 0,
      ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
    });

    await ctx.db.insert("reactions", {
      actorId: args.actorId,
      entryId: entry,
    });

    if (!args.includeCallbackContext) return { id: entry };

    return {
      id: entry,
      entry: {
        id: entry,
        actorId: args.actorId,
        kind: args.kind,
        status: args.defaultStatus,
        title,
        body,
        ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
        upvoteCount: 1,
        commentCount: 0,
      },
    };
  },
});

export const update = mutation({
  args: {
    actor: actorValidator,
    entryId: v.id("entries"),
    kind: v.optional(entryKindValidator),
    title: v.string(),
    body: v.string(),
    editableByAuthor: v.boolean(),
    maxTitleLength: v.number(),
    maxBodyLength: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertActorId(args.actor.id);
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }

    const canEdit =
      actorIsAdmin(args.actor) ||
      (args.editableByAuthor && entry.actorId === args.actor.id);
    if (!canEdit) throw new ConvexError("Not authorized to edit this entry.");
    if (args.kind !== undefined && args.kind !== entry.kind) {
      if (!actorIsAdmin(args.actor)) {
        throw new ConvexError("Admin access is required to change entry kind.");
      }
    }

    const title = normalizeRequiredText(
      args.title,
      "Title",
      args.maxTitleLength,
    );
    const body = normalizeRequiredText(args.body, "Body", args.maxBodyLength);

    await ctx.db.patch("entries", args.entryId, {
      kind: args.kind ?? entry.kind,
      title,
      body,
      normalizedTitle: normalizeTitle(title),
      searchText: `${title}\n${body}`,
      statusFilter: entryStatusFilterForStatus(entry.status),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: {
    actor: actorValidator,
    entryId: v.id("entries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertActorId(args.actor.id);
    if (!actorIsAdmin(args.actor)) {
      throw new ConvexError("Admin access is required to delete an entry.");
    }

    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) return null;

    // Mark and detach in one transaction so every committed read can
    // hide/reject the entry before scheduled cleanup removes dependents.
    // Repeated requests are safe: they only enqueue another idempotent batch.
    if (entry.deletingAt !== undefined) {
      await scheduleEntryCleanup(ctx, args.entryId);
      return null;
    }

    const now = Date.now();
    if (entry.roadmapId !== undefined) {
      const roadmap = await ctx.db.get("roadmap", entry.roadmapId);
      if (roadmap !== null) {
        await ctx.db.patch("roadmap", roadmap._id, {
          feedbackCount: Math.max(0, roadmap.feedbackCount - 1),
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch("entries", args.entryId, {
      roadmapId: undefined,
      deletingAt: now,
      updatedAt: now,
    });
    await scheduleEntryCleanup(ctx, args.entryId);
    return null;
  },
});

/**
 * Remove one bounded slice of an entry's dependent documents. Direct entry
 * reactions are drained first, then comments are processed in index order.
 * Each comment's reactions are drained before the comment is deleted, which
 * keeps this safe for comments with arbitrarily many likes.
 */
export const removeBatch = internalMutation({
  args: { entryId: v.id("entries") },
  returns: v.object({ processed: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null || entry.deletingAt === undefined) {
      return { processed: 0, hasMore: false };
    }

    const directReactions = await ctx.db
      .query("reactions")
      .withIndex("by_entry_actor", (q) => q.eq("entryId", args.entryId))
      .take(deletionBatchSize);
    for (const reaction of directReactions) {
      await ctx.db.delete("reactions", reaction._id);
    }
    if (directReactions.length === deletionBatchSize) {
      await scheduleEntryCleanup(ctx, args.entryId);
      return { processed: directReactions.length, hasMore: true };
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_entry_parent", (q) => q.eq("entryId", args.entryId))
      .take(commentDeletionBatchSize);
    let processed = directReactions.length;

    for (const comment of comments) {
      const commentReactions = await ctx.db
        .query("reactions")
        .withIndex("by_comment_actor", (q) => q.eq("commentId", comment._id))
        .take(reactionDeletionBatchSize + 1);

      const reactionsToDelete = commentReactions.slice(
        0,
        reactionDeletionBatchSize,
      );
      for (const reaction of reactionsToDelete) {
        await ctx.db.delete("reactions", reaction._id);
        processed += 1;
      }

      // Leave this comment in place until its complete reaction set has been
      // drained. It will be the first item in the next indexed batch.
      if (commentReactions.length > reactionDeletionBatchSize) {
        await scheduleEntryCleanup(ctx, args.entryId);
        return { processed, hasMore: true };
      }

      await ctx.db.delete("comments", comment._id);
      processed += 1;
    }

    if (comments.length === commentDeletionBatchSize) {
      await scheduleEntryCleanup(ctx, args.entryId);
      return { processed, hasMore: true };
    }

    await ctx.scheduler.runAfter(0, internal.entries.finalizeRemoval, {
      entryId: args.entryId,
    });
    return { processed, hasMore: false };
  },
});

/** Hard-delete only after a fresh bounded dependency check. */
export const finalizeRemoval = internalMutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null || entry.deletingAt === undefined) return null;

    const [directReaction, comment] = await Promise.all([
      ctx.db
        .query("reactions")
        .withIndex("by_entry_actor", (q) => q.eq("entryId", args.entryId))
        .first(),
      ctx.db
        .query("comments")
        .withIndex("by_entry_parent", (q) => q.eq("entryId", args.entryId))
        .first(),
    ]);

    if (directReaction !== null || comment !== null) {
      await scheduleEntryCleanup(ctx, args.entryId);
      return null;
    }

    await ctx.db.delete("entries", args.entryId);
    return null;
  },
});

export const setStatus = mutation({
  args: {
    actor: actorValidator,
    entryId: v.id("entries"),
    status: entryStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!actorIsAdmin(args.actor)) {
      throw new ConvexError("Admin access is required to change status.");
    }
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) {
      throw new ConvexError("Entry not found.");
    }
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }
    await ctx.db.patch("entries", args.entryId, {
      status: args.status,
      statusFilter: entryStatusFilterForStatus(args.status),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setPriority = mutation({
  args: {
    actor: actorValidator,
    entryId: v.id("entries"),
    priority: v.union(entryPriorityValidator, v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!actorIsAdmin(args.actor)) {
      throw new ConvexError("Admin access is required to change priority.");
    }
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) {
      throw new ConvexError("Entry not found.");
    }
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }
    await ctx.db.patch("entries", args.entryId, {
      priority: args.priority === null ? undefined : args.priority,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setUpvote = mutation({
  args: {
    actorId: v.string(),
    entryId: v.id("entries"),
    desiredState: v.boolean(),
    includeCallbackContext: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({
      active: v.boolean(),
      upvoteCount: v.number(),
    }),
    v.object({
      changed: v.literal(false),
      active: v.boolean(),
      transition: v.null(),
      previousCount: v.number(),
      count: v.number(),
    }),
    v.object({
      changed: v.literal(true),
      active: v.boolean(),
      transition: v.union(v.literal("added"), v.literal("removed")),
      previousCount: v.number(),
      count: v.number(),
      entry: v.object({
        id: v.id("entries"),
        actorId: v.string(),
        kind: entryKindValidator,
        status: entryStatusValidator,
        title: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    assertActorId(args.actorId);
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (entry.deletingAt !== undefined) {
      throw new ConvexError("Entry is being deleted.");
    }

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_entry_actor", (q) =>
        q.eq("entryId", args.entryId).eq("actorId", args.actorId),
      )
      .unique();

    if (args.desiredState && existing === null) {
      await ctx.db.insert("reactions", {
        actorId: args.actorId,
        entryId: args.entryId,
      });
      const upvoteCount = entry.upvoteCount + 1;
      await ctx.db.patch("entries", args.entryId, {
        upvoteCount,
        statusFilter: entryStatusFilterForStatus(entry.status),
      });
      if (!args.includeCallbackContext) {
        return { active: true, upvoteCount };
      }
      return {
        changed: true as const,
        active: true,
        transition: "added" as const,
        previousCount: entry.upvoteCount,
        count: upvoteCount,
        entry: {
          id: entry._id,
          actorId: entry.actorId,
          kind: entry.kind,
          status: entry.status,
          title: entry.title,
        },
      };
    }

    if (!args.desiredState && existing !== null) {
      await ctx.db.delete("reactions", existing._id);
      const upvoteCount = Math.max(0, entry.upvoteCount - 1);
      await ctx.db.patch("entries", args.entryId, {
        upvoteCount,
        statusFilter: entryStatusFilterForStatus(entry.status),
      });
      if (!args.includeCallbackContext) {
        return { active: false, upvoteCount };
      }
      return {
        changed: true as const,
        active: false,
        transition: "removed" as const,
        previousCount: entry.upvoteCount,
        count: upvoteCount,
        entry: {
          id: entry._id,
          actorId: entry.actorId,
          kind: entry.kind,
          status: entry.status,
          title: entry.title,
        },
      };
    }

    if (!args.includeCallbackContext) {
      return { active: args.desiredState, upvoteCount: entry.upvoteCount };
    }
    return {
      changed: false as const,
      active: args.desiredState,
      transition: null,
      previousCount: entry.upvoteCount,
      count: entry.upvoteCount,
    };
  },
});
