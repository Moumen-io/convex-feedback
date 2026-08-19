import { paginator } from "convex-helpers/server/pagination";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

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
} from "./model.js";
import schema from "./schema.js";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    kind: v.optional(entryKindValidator),
    status: v.optional(entryStatusValidator),
    sort: entrySortValidator,
    viewerActorId: v.optional(v.string()),
  },
  returns: paginationResultValidator(publicEntryValidator),
  handler: async (ctx, args) => {
    const db = paginator(ctx.db, schema);
    const { kind, status } = args;

    const result =
      args.sort === "top"
        ? kind !== undefined && status !== undefined
          ? await db
              .query("entries")
              .withIndex("by_kind_status_upvotes", (q) =>
                q.eq("kind", kind).eq("status", status),
              )
              .order("desc")
              .paginate(args.paginationOpts)
          : kind !== undefined
            ? await db
                .query("entries")
                .withIndex("by_kind_upvotes", (q) => q.eq("kind", kind))
                .order("desc")
                .paginate(args.paginationOpts)
            : status !== undefined
              ? await db
                  .query("entries")
                  .withIndex("by_status_upvotes", (q) => q.eq("status", status))
                  .order("desc")
                  .paginate(args.paginationOpts)
              : await db
                  .query("entries")
                  .withIndex("by_upvotes")
                  .order("desc")
                  .paginate(args.paginationOpts)
        : kind !== undefined && status !== undefined
          ? await db
              .query("entries")
              .withIndex("by_kind_status", (q) =>
                q.eq("kind", kind).eq("status", status),
              )
              .order("desc")
              .paginate(args.paginationOpts)
          : kind !== undefined
            ? await db
                .query("entries")
                .withIndex("by_kind", (q) => q.eq("kind", kind))
                .order("desc")
                .paginate(args.paginationOpts)
            : status !== undefined
              ? await db
                  .query("entries")
                  .withIndex("by_status", (q) => q.eq("status", status))
                  .order("desc")
                  .paginate(args.paginationOpts)
              : await db
                  .query("entries")
                  .order("desc")
                  .paginate(args.paginationOpts);

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
    kind: v.optional(entryKindValidator),
    status: v.optional(entryStatusValidator),
    limit: v.number(),
    viewerActorId: v.optional(v.string()),
  },
  returns: v.array(publicEntryValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.searchQuery.trim();
    if (searchQuery.length === 0 || args.limit <= 0) return [];
    const { kind, status } = args;

    const entries =
      kind !== undefined && status !== undefined
        ? await ctx.db
            .query("entries")
            .withSearchIndex("search", (q) =>
              q
                .search("searchText", searchQuery)
                .eq("kind", kind)
                .eq("status", status),
            )
            .take(args.limit)
        : kind !== undefined
          ? await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchQuery).eq("kind", kind),
              )
              .take(args.limit)
          : status !== undefined
            ? await ctx.db
                .query("entries")
                .withSearchIndex("search", (q) =>
                  q.search("searchText", searchQuery).eq("status", status),
                )
                .take(args.limit)
            : await ctx.db
                .query("entries")
                .withSearchIndex("search", (q) =>
                  q.search("searchText", searchQuery),
                )
                .take(args.limit);

    return Promise.all(
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
    if (args.limit <= 0) return { exact: [], similar: [] };

    const title = args.title.trim();
    const body = args.body.trim();
    const { kind } = args;
    if (title.length === 0 && body.length === 0) {
      return { exact: [], similar: [] };
    }

    const normalizedTitle = normalizeTitle(title);
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

    const exactIds = new Set(exactDocs.map((entry) => entry._id));
    const searchText = `${title}\n${body}`.trim();

    const similarDocs =
      searchText.length === 0
        ? []
        : kind === undefined
          ? await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchText),
              )
              .take(args.limit + exactIds.size)
          : await ctx.db
              .query("entries")
              .withSearchIndex("search", (q) =>
                q.search("searchText", searchText).eq("kind", kind),
              )
              .take(args.limit + exactIds.size);

    const similarFiltered = similarDocs
      .filter((entry) => !exactIds.has(entry._id))
      .slice(0, args.limit);

    return {
      exact: await Promise.all(
        exactDocs.map((entry) =>
          serializeEntry(ctx, entry, args.viewerActorId),
        ),
      ),
      similar: await Promise.all(
        similarFiltered.map((entry) =>
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

    return await ctx.db.insert("entries", {
      actorId: args.actorId,
      kind: args.kind,
      status: args.defaultStatus,
      title,
      body,
      normalizedTitle: normalizeTitle(title),
      searchText: `${title}\n${body}`,
      upvoteCount: 0,
      commentCount: 0,
    });
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
