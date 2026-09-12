import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api.js";
import { internalMutation, mutation, query } from "./_generated/server.js";
import { normalizeRequiredText, serializeTag } from "./helpers.js";
import { actorValidator, tagValidator } from "./model.js";

const deletionBatchSize = 100;

function assertAdmin(actor: { id: string; isAdmin: boolean }): void {
  if (!actor.isAdmin) throw new ConvexError("Admin access is required.");
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function normalizeColor(color: string | undefined): string | undefined {
  const value = color?.trim();
  if (value === undefined || value.length === 0) return undefined;
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new ConvexError("Tag color must be a six-digit hexadecimal color.");
  }
  return value.toUpperCase();
}

export const list = query({
  args: {},
  returns: v.array(tagValidator),
  handler: async (ctx) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_normalized_name")
      .collect();
    return tags.filter((tag) => tag.deletingAt === undefined).map(serializeTag);
  },
});

export const create = mutation({
  args: {
    actor: actorValidator,
    name: v.string(),
    color: v.optional(v.string()),
  },
  returns: v.id("tags"),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const name = normalizeRequiredText(args.name, "Tag name", 48);
    const normalizedName = normalizeName(name);
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName),
      )
      .unique();
    if (existing !== null)
      throw new ConvexError("A tag with this name exists.");

    return await ctx.db.insert("tags", {
      name,
      normalizedName,
      ...(normalizeColor(args.color) === undefined
        ? {}
        : { color: normalizeColor(args.color) }),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    actor: actorValidator,
    tagId: v.id("tags"),
    name: v.string(),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const tag = await ctx.db.get("tags", args.tagId);
    if (tag === null) {
      throw new ConvexError("Tag not found.");
    }
    if (tag.deletingAt !== undefined) {
      throw new ConvexError("Tag is being deleted.");
    }
    const name = normalizeRequiredText(args.name, "Tag name", 48);
    const normalizedName = normalizeName(name);
    const duplicate = await ctx.db
      .query("tags")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName),
      )
      .unique();
    if (duplicate !== null && duplicate._id !== args.tagId) {
      throw new ConvexError("A tag with this name exists.");
    }
    await ctx.db.patch("tags", args.tagId, {
      name,
      normalizedName,
      color: normalizeColor(args.color),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { actor: actorValidator, tagId: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const tag = await ctx.db.get("tags", args.tagId);
    if (tag === null || tag.deletingAt !== undefined) return null;

    await ctx.db.patch("tags", args.tagId, { deletingAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.tags.removeBatch, {
      tagId: args.tagId,
      cursor: null,
    });
    return null;
  },
});

export const removeBatch = internalMutation({
  args: {
    tagId: v.id("tags"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({ processed: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const tag = await ctx.db.get("tags", args.tagId);
    if (tag === null || tag.deletingAt === undefined) {
      return { processed: 0, hasMore: false };
    }

    const page = await ctx.db.query("entries").paginate({
      cursor: args.cursor,
      numItems: deletionBatchSize,
    });
    const now = Date.now();

    for (const entry of page.page) {
      const current = entry.tagIds ?? [];
      if (!current.includes(args.tagId)) continue;
      const remaining = current.filter((tagId) => tagId !== args.tagId);
      await ctx.db.patch("entries", entry._id, {
        tagIds: remaining.length === 0 ? undefined : remaining,
        updatedAt: now,
      });
    }

    if (page.isDone) {
      await ctx.scheduler.runAfter(0, internal.tags.finalizeRemoval, {
        tagId: args.tagId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.tags.removeBatch, {
        tagId: args.tagId,
        cursor: page.continueCursor,
      });
    }

    return { processed: page.page.length, hasMore: !page.isDone };
  },
});

export const finalizeRemoval = internalMutation({
  args: { tagId: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tag = await ctx.db.get("tags", args.tagId);
    if (tag === null || tag.deletingAt === undefined) return null;
    await ctx.db.delete("tags", args.tagId);
    return null;
  },
});

export const attach = mutation({
  args: {
    actor: actorValidator,
    entryId: v.id("entries"),
    tagId: v.id("tags"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const [entry, tag] = await Promise.all([
      ctx.db.get("entries", args.entryId),
      ctx.db.get("tags", args.tagId),
    ]);
    if (entry === null) throw new ConvexError("Entry not found.");
    if (tag === null) throw new ConvexError("Tag not found.");
    if (tag.deletingAt !== undefined) {
      throw new ConvexError("Tag is being deleted.");
    }

    const tagIds = entry.tagIds ?? [];
    if (tagIds.includes(args.tagId)) return null;

    await ctx.db.patch("entries", args.entryId, {
      tagIds: [...tagIds, args.tagId],
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const detach = mutation({
  args: {
    actor: actorValidator,
    entryId: v.id("entries"),
    tagId: v.id("tags"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.actor);
    const entry = await ctx.db.get("entries", args.entryId);
    if (entry === null) throw new ConvexError("Entry not found.");

    const current = entry.tagIds ?? [];
    if (!current.includes(args.tagId)) return null;
    const remaining = current.filter((tagId) => tagId !== args.tagId);
    await ctx.db.patch("entries", args.entryId, {
      tagIds: remaining.length === 0 ? undefined : remaining,
      updatedAt: Date.now(),
    });
    return null;
  },
});
