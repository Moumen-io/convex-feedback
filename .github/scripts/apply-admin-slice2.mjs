import { readFileSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content);
}

function replaceExact(path, from, to) {
  const content = read(path);
  const first = content.indexOf(from);
  if (first === -1) throw new Error(`Expected block not found in ${path}`);
  if (content.indexOf(from, first + from.length) !== -1) {
    throw new Error(`Expected block is not unique in ${path}`);
  }
  write(path, content.slice(0, first) + to + content.slice(first + from.length));
}

function replaceRegex(path, pattern, replacement) {
  const content = read(path);
  const matches = [...content.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one regex match in ${path}, got ${matches.length}`);
  }
  write(path, content.replace(pattern, replacement));
}

// Schema: arbitrary tag IDs live directly on the feedback document.
replaceExact(
  "packages/convex-feedback/src/component/schema.ts",
  `    primaryTagId: v.optional(v.id("tags")),\n    secondaryTagId: v.optional(v.id("tags")),\n`,
  `    tagIds: v.optional(v.array(v.id("tags"))),\n`,
);
replaceExact(
  "packages/convex-feedback/src/component/schema.ts",
  `    .index("by_primary_tag_id", ["primaryTagId"])\n    .index("by_secondary_tag_id", ["secondaryTagId"])\n`,
  "",
);

// Admin model exposes one arbitrary tag array rather than two named slots.
replaceExact(
  "packages/convex-feedback/src/component/model.ts",
  `export const adminEntryValidator = publicEntryValidator.extend({\n  priority: v.optional(entryPriorityValidator),\n  primaryTag: v.optional(tagValidator),\n  secondaryTag: v.optional(tagValidator),\n  roadmap: v.optional(roadmapItemValidator),\n  metadata: v.optional(feedbackMetadataValidator),\n});`,
  `export const adminEntryValidator = publicEntryValidator.extend({\n  priority: v.optional(entryPriorityValidator),\n  tags: v.array(tagValidator),\n  roadmap: v.optional(roadmapItemValidator),\n  metadata: v.optional(feedbackMetadataValidator),\n});`,
);
replaceExact(
  "packages/convex-feedback/src/component/model.ts",
  `/** Admin-managed tag attached to an entry as primary or secondary metadata. */`,
  `/** Admin-managed tag attached to an entry as private triage metadata. */`,
);

// Resolve all attached tags when serializing admin entries.
replaceRegex(
  "packages/convex-feedback/src/component/helpers.ts",
  /export async function serializeAdminEntry\([\s\S]*?\n}\n\nexport async function serializeComment/,
  `export async function serializeAdminEntry(\n  ctx: QueryCtx,\n  entry: DataModel["entries"]["document"],\n  viewerActorId: string,\n): Promise<AdminFeedbackEntry> {\n  const [base, tagDocuments, roadmap] = await Promise.all([\n    serializeEntry(ctx, entry, viewerActorId, true),\n    Promise.all((entry.tagIds ?? []).map((tagId) => ctx.db.get("tags", tagId))),\n    entry.roadmapId === undefined\n      ? null\n      : ctx.db.get("roadmap", entry.roadmapId),\n  ]);\n\n  return {\n    ...base,\n    ...(entry.priority === undefined ? {} : { priority: entry.priority }),\n    tags: tagDocuments.flatMap((tag) =>\n      tag === null ? [] : [serializeTag(tag)],\n    ),\n    ...(roadmap === null ? {} : { roadmap: serializeRoadmapItem(roadmap) }),\n  };\n}\n\nexport async function serializeComment`,
);

// Tag mutations now operate on an arbitrary tagIds array.
write(
  "packages/convex-feedback/src/component/tags.ts",
  `import { ConvexError, v } from "convex/values";\n\nimport { mutation, query } from "./_generated/server.js";\nimport { normalizeRequiredText, serializeTag } from "./helpers.js";\nimport { actorValidator, tagValidator } from "./model.js";\n\nfunction assertAdmin(actor: { id: string; isAdmin: boolean }): void {\n  if (!actor.isAdmin) throw new ConvexError("Admin access is required.");\n}\n\nfunction normalizeName(name: string): string {\n  return name.trim().replace(/\\s+/g, " ").toLocaleLowerCase("en-US");\n}\n\nfunction normalizeColor(color: string | undefined): string | undefined {\n  const value = color?.trim();\n  if (value === undefined || value.length === 0) return undefined;\n  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {\n    throw new ConvexError("Tag color must be a six-digit hexadecimal color.");\n  }\n  return value.toUpperCase();\n}\n\nexport const list = query({\n  args: {},\n  returns: v.array(tagValidator),\n  handler: async (ctx) => {\n    const tags = await ctx.db\n      .query("tags")\n      .withIndex("by_normalized_name")\n      .collect();\n    return tags.map(serializeTag);\n  },\n});\n\nexport const create = mutation({\n  args: {\n    actor: actorValidator,\n    name: v.string(),\n    color: v.optional(v.string()),\n  },\n  returns: v.id("tags"),\n  handler: async (ctx, args) => {\n    assertAdmin(args.actor);\n    const name = normalizeRequiredText(args.name, "Tag name", 48);\n    const normalizedName = normalizeName(name);\n    const existing = await ctx.db\n      .query("tags")\n      .withIndex("by_normalized_name", (q) =>\n        q.eq("normalizedName", normalizedName),\n      )\n      .unique();\n    if (existing !== null)\n      throw new ConvexError("A tag with this name exists.");\n\n    return await ctx.db.insert("tags", {\n      name,\n      normalizedName,\n      ...(normalizeColor(args.color) === undefined\n        ? {}\n        : { color: normalizeColor(args.color) }),\n      updatedAt: Date.now(),\n    });\n  },\n});\n\nexport const update = mutation({\n  args: {\n    actor: actorValidator,\n    tagId: v.id("tags"),\n    name: v.string(),\n    color: v.optional(v.string()),\n  },\n  returns: v.null(),\n  handler: async (ctx, args) => {\n    assertAdmin(args.actor);\n    if ((await ctx.db.get("tags", args.tagId)) === null) {\n      throw new ConvexError("Tag not found.");\n    }\n    const name = normalizeRequiredText(args.name, "Tag name", 48);\n    const normalizedName = normalizeName(name);\n    const duplicate = await ctx.db\n      .query("tags")\n      .withIndex("by_normalized_name", (q) =>\n        q.eq("normalizedName", normalizedName),\n      )\n      .unique();\n    if (duplicate !== null && duplicate._id !== args.tagId) {\n      throw new ConvexError("A tag with this name exists.");\n    }\n    await ctx.db.patch("tags", args.tagId, {\n      name,\n      normalizedName,\n      color: normalizeColor(args.color),\n      updatedAt: Date.now(),\n    });\n    return null;\n  },\n});\n\nexport const remove = mutation({\n  args: { actor: actorValidator, tagId: v.id("tags") },\n  returns: v.null(),\n  handler: async (ctx, args) => {\n    assertAdmin(args.actor);\n    if ((await ctx.db.get("tags", args.tagId)) === null) return null;\n\n    // Slice 3 will move this cleanup to bounded batches. For now, preserve\n    // existing deletion semantics while tags live directly on each entry.\n    const entries = await ctx.db.query("entries").collect();\n    for (const entry of entries) {\n      const current = entry.tagIds ?? [];\n      if (!current.includes(args.tagId)) continue;\n      const remaining = current.filter((tagId) => tagId !== args.tagId);\n      await ctx.db.patch("entries", entry._id, {\n        tagIds: remaining.length === 0 ? undefined : remaining,\n        updatedAt: Date.now(),\n      });\n    }\n\n    await ctx.db.delete("tags", args.tagId);\n    return null;\n  },\n});\n\nexport const attach = mutation({\n  args: {\n    actor: actorValidator,\n    entryId: v.id("entries"),\n    tagId: v.id("tags"),\n  },\n  returns: v.null(),\n  handler: async (ctx, args) => {\n    assertAdmin(args.actor);\n    const [entry, tag] = await Promise.all([\n      ctx.db.get("entries", args.entryId),\n      ctx.db.get("tags", args.tagId),\n    ]);\n    if (entry === null) throw new ConvexError("Entry not found.");\n    if (tag === null) throw new ConvexError("Tag not found.");\n\n    const tagIds = entry.tagIds ?? [];\n    if (tagIds.includes(args.tagId)) return null;\n\n    await ctx.db.patch("entries", args.entryId, {\n      tagIds: [...tagIds, args.tagId],\n      updatedAt: Date.now(),\n    });\n    return null;\n  },\n});\n\nexport const detach = mutation({\n  args: {\n    actor: actorValidator,\n    entryId: v.id("entries"),\n    tagId: v.id("tags"),\n  },\n  returns: v.null(),\n  handler: async (ctx, args) => {\n    assertAdmin(args.actor);\n    const entry = await ctx.db.get("entries", args.entryId);\n    if (entry === null) throw new ConvexError("Entry not found.");\n\n    const current = entry.tagIds ?? [];\n    if (!current.includes(args.tagId)) return null;\n    const remaining = current.filter((tagId) => tagId !== args.tagId);\n    await ctx.db.patch("entries", args.entryId, {\n      tagIds: remaining.length === 0 ? undefined : remaining,\n      updatedAt: Date.now(),\n    });\n    return null;\n  },\n});\n`,
);

// Admin pagination: pre-filter arbitrary tag membership before page boundaries.
// Full-text search keeps the search index when all filters are indexable; tag
// membership and multi-kind OR searches use a pre-filtered stream so pages do
// not become empty simply because matching rows occur after the raw page.
write(
  "packages/convex-feedback/src/component/admin.ts",
  `import {\n  paginationOptsValidator,\n  paginationResultValidator,\n} from "convex/server";\nimport { ConvexError, v } from "convex/values";\nimport { stream } from "convex-helpers/server/stream";\n\nimport type { Doc } from "./_generated/dataModel.js";\nimport { query } from "./_generated/server.js";\nimport { serializeAdminEntry } from "./helpers.js";\nimport {\n  adminEntryValidator,\n  entryKindValidator,\n  entryPriorityValidator,\n  entryStatusValidator,\n  type EntryKind,\n  type EntryPriority,\n  type EntryStatus,\n} from "./model.js";\nimport schema from "./schema.js";\n\nfunction matchesFilters(\n  entry: Doc<"entries">,\n  kinds: EntryKind[] | undefined,\n  status: EntryStatus | undefined,\n  priority: EntryPriority | undefined,\n  tagId: string | undefined,\n): boolean {\n  return (\n    (kinds === undefined || kinds.includes(entry.kind)) &&\n    (status === undefined || entry.status === status) &&\n    (priority === undefined || entry.priority === priority) &&\n    (tagId === undefined || entry.tagIds?.includes(tagId) === true)\n  );\n}\n\nfunction matchesSearch(entry: Doc<"entries">, searchQuery: string): boolean {\n  const haystack = entry.searchText.toLocaleLowerCase("en-US");\n  const terms = searchQuery\n    .toLocaleLowerCase("en-US")\n    .split(/\\s+/)\n    .filter((term) => term.length > 0);\n  return terms.every((term) => haystack.includes(term));\n}\n\nexport const getEntry = query({\n  args: { entryId: v.id("entries"), viewerActorId: v.string() },\n  returns: v.union(adminEntryValidator, v.null()),\n  handler: async (ctx, args) => {\n    const entry = await ctx.db.get("entries", args.entryId);\n    return entry === null\n      ? null\n      : await serializeAdminEntry(ctx, entry, args.viewerActorId);\n  },\n});\n\nexport const listEntries = query({\n  args: {\n    kinds: v.optional(v.array(entryKindValidator)),\n    status: v.optional(entryStatusValidator),\n    priority: v.optional(entryPriorityValidator),\n    tagId: v.optional(v.id("tags")),\n    paginationOpts: paginationOptsValidator,\n    viewerActorId: v.string(),\n  },\n  returns: paginationResultValidator(adminEntryValidator),\n  handler: async (ctx, args) => {\n    const kinds =\n      args.kinds === undefined ? undefined : [...new Set(args.kinds)];\n    if (kinds?.length === 0) {\n      throw new ConvexError("\\`kinds\\` must contain at least one kind.");\n    }\n\n    const entriesStream =\n      args.priority !== undefined\n        ? stream(ctx.db, schema)\n            .query("entries")\n            .withIndex("by_priority", (q) => q.eq("priority", args.priority))\n        : args.status !== undefined\n          ? stream(ctx.db, schema)\n              .query("entries")\n              .withIndex("by_status", (q) => q.eq("status", args.status))\n          : kinds?.length === 1\n            ? stream(ctx.db, schema)\n                .query("entries")\n                .withIndex("by_kind", (q) => q.eq("kind", kinds[0]!))\n            : stream(ctx.db, schema).query("entries");\n\n    const result = await entriesStream\n      .order("desc")\n      .filterWith((entry) =>\n        Promise.resolve(\n          matchesFilters(\n            entry,\n            kinds,\n            args.status,\n            args.priority,\n            args.tagId,\n          ),\n        ),\n      )\n      .paginate(args.paginationOpts);\n\n    return {\n      ...result,\n      page: await Promise.all(\n        result.page.map((entry) =>\n          serializeAdminEntry(ctx, entry, args.viewerActorId),\n        ),\n      ),\n    };\n  },\n});\n\nexport const searchEntries = query({\n  args: {\n    searchQuery: v.string(),\n    kinds: v.optional(v.array(entryKindValidator)),\n    status: v.optional(entryStatusValidator),\n    priority: v.optional(entryPriorityValidator),\n    tagId: v.optional(v.id("tags")),\n    paginationOpts: paginationOptsValidator,\n    viewerActorId: v.string(),\n  },\n  returns: paginationResultValidator(adminEntryValidator),\n  handler: async (ctx, args) => {\n    const searchQuery = args.searchQuery.trim();\n    if (searchQuery.length === 0) {\n      return { page: [], isDone: true, continueCursor: "" };\n    }\n    const kinds =\n      args.kinds === undefined ? undefined : [...new Set(args.kinds)];\n    if (kinds?.length === 0) {\n      throw new ConvexError("\\`kinds\\` must contain at least one kind.");\n    }\n\n    const canUseSearchIndex =\n      args.tagId === undefined && (kinds === undefined || kinds.length === 1);\n\n    const result = canUseSearchIndex\n      ? await ctx.db\n          .query("entries")\n          .withSearchIndex("search", (q) => {\n            const searched = q.search("searchText", searchQuery);\n            const withKind =\n              kinds?.length === 1\n                ? searched.eq("kind", kinds[0]!)\n                : searched;\n            const withStatus =\n              args.status === undefined\n                ? withKind\n                : withKind.eq("status", args.status);\n            return args.priority === undefined\n              ? withStatus\n              : withStatus.eq("priority", args.priority);\n          })\n          .paginate(args.paginationOpts)\n      : await (\n          args.priority !== undefined\n            ? stream(ctx.db, schema)\n                .query("entries")\n                .withIndex("by_priority", (q) =>\n                  q.eq("priority", args.priority),\n                )\n            : args.status !== undefined\n              ? stream(ctx.db, schema)\n                  .query("entries")\n                  .withIndex("by_status", (q) => q.eq("status", args.status))\n              : kinds?.length === 1\n                ? stream(ctx.db, schema)\n                    .query("entries")\n                    .withIndex("by_kind", (q) => q.eq("kind", kinds[0]!))\n                : stream(ctx.db, schema).query("entries")\n        )\n          .order("desc")\n          .filterWith((entry) =>\n            Promise.resolve(\n              matchesFilters(\n                entry,\n                kinds,\n                args.status,\n                args.priority,\n                args.tagId,\n              ) && matchesSearch(entry, searchQuery),\n            ),\n          )\n          .paginate(args.paginationOpts);\n\n    return {\n      ...result,\n      page: await Promise.all(\n        result.page.map((entry) =>\n          serializeAdminEntry(ctx, entry, args.viewerActorId),\n        ),\n      ),\n    };\n  },\n});\n`,
);

// Public host API uses tag IDs for attach/detach.
replaceExact(
  "packages/convex-feedback/src/client/api.ts",
  `export type AttachTagArgs = {\n  entryId: string;\n  tagId: string;\n  placement: "primary" | "secondary";\n};\nexport type DetachTagArgs = {\n  entryId: string;\n  placement: "primary" | "secondary";\n};`,
  `export type AttachTagArgs = {\n  entryId: string;\n  tagId: string;\n};\nexport type DetachTagArgs = {\n  entryId: string;\n  tagId: string;\n};`,
);
replaceExact(
  "packages/convex-feedback/src/client/index.ts",
  `      args: {\n        entryId: v.string(),\n        tagId: v.string(),\n        placement: v.union(v.literal("primary"), v.literal("secondary")),\n      },`,
  `      args: {\n        entryId: v.string(),\n        tagId: v.string(),\n      },`,
);
replaceExact(
  "packages/convex-feedback/src/client/index.ts",
  `    detachTag: mutationGeneric({\n      args: {\n        entryId: v.string(),\n        placement: v.union(v.literal("primary"), v.literal("secondary")),\n      },`,
  `    detachTag: mutationGeneric({\n      args: {\n        entryId: v.string(),\n        tagId: v.string(),\n      },`,
);

// Web inbox renders arbitrary tags.
replaceExact(
  "apps/admin/withClerk/web/src/components/inbox.tsx",
  `          {entry.primaryTag && (\n            <Badge variant="secondary">{entry.primaryTag.name}</Badge>\n          )}\n          {entry.secondaryTag && (\n            <Badge variant="outline">{entry.secondaryTag.name}</Badge>\n          )}`,
  `          {entry.tags.slice(0, 3).map((tag) => (\n            <Badge key={tag.id} variant="secondary">\n              {tag.name}\n            </Badge>\n          ))}\n          {entry.tags.length > 3 && (\n            <Badge variant="outline">+{entry.tags.length - 3}</Badge>\n          )}`,
);

// Web detail supports attaching/removing any number of tags.
replaceRegex(
  "apps/admin/withClerk/web/src/components/feedback-sheet.tsx",
  /  const changeTag = \(placement: "primary" \| "secondary", tagId: string\) => \{[\s\S]*?\n  \};/,
  `  const toggleTag = (tag: FeedbackTag) => {\n    if (!entryId || !entry) return;\n    const attached = entry.tags.some((candidate) => candidate.id === tag.id);\n    void notify(\n      attached\n        ? detachTag({ entryId, tagId: tag.id })\n        : attachTag({ entryId, tagId: tag.id }),\n      attached ? "Tag removed" : "Tag attached",\n    );\n  };`,
);
replaceExact(
  "apps/admin/withClerk/web/src/components/feedback-sheet.tsx",
  `                <Field>\n                  <FieldLabel>Primary tag</FieldLabel>\n                  <TagSelect\n                    tags={tags}\n                    value={entry.primaryTag?.id ?? "none"}\n                    onValueChange={(value) => changeTag("primary", value)}\n                  />\n                </Field>\n                <Field>\n                  <FieldLabel>Secondary tag</FieldLabel>\n                  <TagSelect\n                    tags={tags}\n                    value={entry.secondaryTag?.id ?? "none"}\n                    onValueChange={(value) => changeTag("secondary", value)}\n                  />\n                </Field>`,
  `                <Field className="sm:col-span-2">\n                  <FieldLabel>Tags</FieldLabel>\n                  <TagPicker\n                    tags={tags}\n                    selected={entry.tags}\n                    onToggle={toggleTag}\n                  />\n                </Field>`,
);
replaceRegex(
  "apps/admin/withClerk/web/src/components/feedback-sheet.tsx",
  /function TagSelect\([\s\S]*?\n}\n\nfunction RoadmapSelector/,
  `function TagPicker({\n  tags,\n  selected,\n  onToggle,\n}: {\n  tags: FeedbackTag[] | undefined;\n  selected: FeedbackTag[];\n  onToggle: (tag: FeedbackTag) => void;\n}) {\n  if (!tags || tags.length === 0) {\n    return (\n      <p className="text-sm text-muted-foreground">\n        No tags configured yet. Create tags from the Tags view.\n      </p>\n    );\n  }\n\n  const selectedIds = new Set(selected.map((tag) => tag.id));\n  return (\n    <div className="flex flex-wrap gap-2">\n      {tags.map((tag) => {\n        const active = selectedIds.has(tag.id);\n        return (\n          <Button\n            key={tag.id}\n            type="button"\n            variant={active ? "secondary" : "outline"}\n            size="sm"\n            onClick={() => onToggle(tag)}\n          >\n            {active && <CheckIcon data-icon="inline-start" />}\n            {tag.name}\n          </Button>\n        );\n      })}\n    </div>\n  );\n}\n\nfunction RoadmapSelector`,
);

// Native detail exposes arbitrary tag chips.
replaceRegex(
  "apps/admin/withClerk/native/app/feedback/[entryId].tsx",
  /  const cycleTag = async \(placement: "primary" \| "secondary"\) => \{[\s\S]*?\n  \};/,
  `  const toggleTag = async (tagId: string) => {\n    const attached = entry.tags.some((tag) => tag.id === tagId);\n    try {\n      if (attached) await detachTag({ entryId: entry.id, tagId });\n      else await attachTag({ entryId: entry.id, tagId });\n    } catch (error) {\n      Alert.alert(\n        "Could not update tag",\n        error instanceof Error ? error.message : "Try again.",\n      );\n    }\n  };`,
);
replaceExact(
  "apps/admin/withClerk/native/app/feedback/[entryId].tsx",
  `        <Control\n          label="Primary tag"\n          value={entry.primaryTag?.name ?? "none"}\n          onPress={() => void cycleTag("primary")}\n        />\n        <Control\n          label="Secondary tag"\n          value={entry.secondaryTag?.name ?? "none"}\n          onPress={() => void cycleTag("secondary")}\n        />\n      </View>\n      <View style={styles.divider} />`,
  `      </View>\n      <Text style={styles.tagSectionLabel}>Tags</Text>\n      <View style={styles.tagList}>\n        {(tags ?? []).map((tag) => {\n          const active = entry.tags.some((candidate) => candidate.id === tag.id);\n          return (\n            <Pressable\n              key={tag.id}\n              style={[styles.tagChip, active && styles.tagChipActive]}\n              onPress={() => void toggleTag(tag.id)}\n            >\n              <Text\n                style={[\n                  styles.tagChipText,\n                  active && styles.tagChipTextActive,\n                ]}\n              >\n                {active ? "✓ " : ""}\n                {tag.name}\n              </Text>\n            </Pressable>\n          );\n        })}\n        {(tags?.length ?? 0) === 0 && (\n          <Text style={styles.label}>No tags configured.</Text>\n        )}\n      </View>\n      <View style={styles.divider} />`,
);
replaceExact(
  "apps/admin/withClerk/native/app/feedback/[entryId].tsx",
  `  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },\n  control: {`,
  `  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },\n  tagSectionLabel: { color: adminTheme.muted, fontSize: 11 },\n  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },\n  tagChip: {\n    borderWidth: 1,\n    borderColor: adminTheme.border,\n    borderRadius: 999,\n    backgroundColor: adminTheme.surface,\n    paddingHorizontal: 10,\n    paddingVertical: 7,\n  },\n  tagChipActive: {\n    borderColor: adminTheme.primary,\n    backgroundColor: adminTheme.primarySoft,\n  },\n  tagChipText: { color: adminTheme.text, fontSize: 12 },\n  tagChipTextActive: { color: adminTheme.primary, fontWeight: "700" },\n  control: {`,
);

// Existing component regression now verifies >2 tags and tag-id detach semantics.
replaceRegex(
  "packages/convex-feedback/test/component.test.ts",
  /  test\("admin priority and tags stay private and tag deletion cascades", async \(\) => \{[\s\S]*?\n  \}\);\n\n  test\("roadmap uses fractional positions/,
  `  test("admin priority and arbitrary tags stay private and deletion cascades", async () => {\n    const testInstance = setup();\n    const entryId = await createEntry(testInstance, "Admin triage target");\n    const actor = { id: "admin-1", isAdmin: true } as const;\n    const revenueTagId = await testInstance.mutation(api.tags.create, {\n      actor,\n      name: "Revenue",\n      color: "#8b5cf6",\n    });\n    const mobileTagId = await testInstance.mutation(api.tags.create, {\n      actor,\n      name: "Mobile",\n    });\n    const retentionTagId = await testInstance.mutation(api.tags.create, {\n      actor,\n      name: "Retention",\n    });\n\n    await testInstance.mutation(api.entries.setPriority, {\n      actor,\n      entryId,\n      priority: "high",\n    });\n    for (const tagId of [revenueTagId, mobileTagId, retentionTagId]) {\n      await testInstance.mutation(api.tags.attach, { actor, entryId, tagId });\n    }\n\n    const publicEntry = await testInstance.query(api.entries.get, { entryId });\n    expect(publicEntry).not.toHaveProperty("priority");\n    expect(publicEntry).not.toHaveProperty("tags");\n\n    const adminEntry = await testInstance.query(api.admin.getEntry, {\n      entryId,\n      viewerActorId: actor.id,\n    });\n    expect(adminEntry?.priority).toBe("high");\n    expect(adminEntry?.tags.map((tag) => tag.name)).toEqual([\n      "Revenue",\n      "Mobile",\n      "Retention",\n    ]);\n\n    const filtered = await testInstance.query(api.admin.listEntries, {\n      tagId: retentionTagId,\n      priority: "high",\n      paginationOpts: { cursor: null, numItems: 10 },\n      viewerActorId: actor.id,\n    });\n    expect(filtered.page.map((entry) => entry.id)).toEqual([entryId]);\n\n    await testInstance.mutation(api.tags.detach, {\n      actor,\n      entryId,\n      tagId: mobileTagId,\n    });\n    await testInstance.mutation(api.tags.remove, {\n      actor,\n      tagId: revenueTagId,\n    });\n\n    const stored = await testInstance.run((ctx) =>\n      ctx.db.get("entries", entryId),\n    );\n    expect(stored?.tagIds).toEqual([retentionTagId]);\n  });\n\n  test("roadmap uses fractional positions`,
);

write(
  "packages/convex-feedback/test/admin-filtering.test.ts",
  `import { convexTest } from "convex-test";\nimport { describe, expect, test } from "vitest";\n\nimport { api } from "../src/component/_generated/api.js";\nimport type { Id } from "../src/component/_generated/dataModel.js";\nimport schema from "../src/component/schema.js";\n\nconst modules = import.meta.glob("../src/component/**/*.ts");\nconst actor = { id: "admin-1", isAdmin: true } as const;\n\nfunction setup() {\n  return convexTest(schema, modules);\n}\n\nasync function createEntry(\n  testInstance: ReturnType<typeof setup>,\n  title: string,\n): Promise<Id<"entries">> {\n  return await testInstance.mutation(api.entries.create, {\n    actorId: "author-1",\n    kind: "feature_request",\n    title,\n    body: "Common searchable needle for pagination coverage.",\n    defaultStatus: "open",\n    enabledKinds: ["feedback", "feature_request", "bug_report"],\n    maxTitleLength: 160,\n    maxBodyLength: 10_000,\n  });\n}\n\ndescribe("admin filtering pagination", () => {\n  test("tag filtering happens before list and search page boundaries", async () => {\n    const testInstance = setup();\n    const targetId = await createEntry(testInstance, "Needle target");\n    for (let index = 0; index < 30; index += 1) {\n      await createEntry(testInstance, "Needle decoy " + index);\n    }\n\n    const tagId = await testInstance.mutation(api.tags.create, {\n      actor,\n      name: "Target only",\n    });\n    await testInstance.mutation(api.tags.attach, {\n      actor,\n      entryId: targetId,\n      tagId,\n    });\n\n    const listed = await testInstance.query(api.admin.listEntries, {\n      tagId,\n      paginationOpts: { cursor: null, numItems: 1 },\n      viewerActorId: actor.id,\n    });\n    expect(listed.page.map((entry) => entry.id)).toEqual([targetId]);\n\n    const searched = await testInstance.query(api.admin.searchEntries, {\n      searchQuery: "common searchable needle",\n      tagId,\n      paginationOpts: { cursor: null, numItems: 1 },\n      viewerActorId: actor.id,\n    });\n    expect(searched.page.map((entry) => entry.id)).toEqual([targetId]);\n  });\n\n  test("multi-kind admin search pre-filters before pagination", async () => {\n    const testInstance = setup();\n    const targetId = await createEntry(testInstance, "Multi kind target");\n    for (let index = 0; index < 20; index += 1) {\n      await testInstance.mutation(api.entries.create, {\n        actorId: "author-2",\n        kind: "feedback",\n        title: "Multi kind decoy " + index,\n        body: "Common searchable needle for pagination coverage.",\n        defaultStatus: "open",\n        enabledKinds: ["feedback", "feature_request", "bug_report"],\n        maxTitleLength: 160,\n        maxBodyLength: 10_000,\n      });\n    }\n\n    const result = await testInstance.query(api.admin.searchEntries, {\n      searchQuery: "multi kind target",\n      kinds: ["feature_request", "bug_report"],\n      paginationOpts: { cursor: null, numItems: 1 },\n      viewerActorId: actor.id,\n    });\n    expect(result.page.map((entry) => entry.id)).toEqual([targetId]);\n  });\n});\n`,
);

// Documentation reflects the arbitrary-tag model.
replaceExact(
  "packages/convex-feedback/README.md",
  `- Admin priority, primary/secondary tags, and roadmap workflows.`,
  `- Admin priority, arbitrary tags, and roadmap workflows.`,
);
replaceExact(
  "packages/convex-feedback/README.md",
  `Admin entries may have an optional \`low\`, \`medium\`, or \`high\` priority; at most one primary and one secondary tag; and one roadmap relation. Deleting a tag clears either tag slot from related entries. Deleting a roadmap item detaches all related feedback. Public entry queries and the existing public UI do not expose this internal metadata.`,
  `Admin entries may have an optional \`low\`, \`medium\`, or \`high\` priority; any number of admin-managed tags; and one roadmap relation. Tag IDs are stored directly on each feedback entry rather than in a relation table. Deleting a tag removes its ID from related entries. Deleting a roadmap item detaches all related feedback. Public entry queries and the existing public UI do not expose this internal metadata.`,
);

console.log("Applied admin slice 2 filtering and arbitrary-tag changes.");
