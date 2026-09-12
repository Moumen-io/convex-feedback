import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import { normalizeRequiredText, serializeTag } from "./helpers.js";
import { actorValidator, tagValidator } from "./model.js";

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
    return tags.map(serializeTag);
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
    if ((await ctx.db.get("tags", args.tagId)) === null) {
      throw new ConvexError("Tag not found.");
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
    if ((await ctx.db.get("tags", args.tagId)) === null) return null;

    // Slice 3 will move this cleanup to bounded batches. For now, preserve
    // existing deletion semantics while tags live directly on each entry.
    const entries = await ctx.db.query("entries").collect();
    for (const entry of entries) {
      const current = entry.tagIds ?? [];
      if (!current.includes(args.tagId)) continue;
      const remaining = current.filter((tagId) => tagId !== args.tagId);
      await ctx.db.patch("entries", entry._id, {
        tagIds: remaining.length === 0 ? undefined : remaining,
        updatedAt: Date.now(),
      });
    }

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
