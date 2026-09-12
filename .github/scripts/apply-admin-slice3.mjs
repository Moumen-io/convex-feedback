import { readFileSync, writeFileSync } from "node:fs";

const path = "packages/convex-feedback/test/component.test.ts";
let content = readFileSync(path, "utf8");

function replaceExact(from, to) {
  const first = content.indexOf(from);
  if (first === -1) throw new Error("Expected test block not found");
  if (content.indexOf(from, first + from.length) !== -1) {
    throw new Error("Expected test block is not unique");
  }
  content = content.slice(0, first) + to + content.slice(first + from.length);
}

replaceExact(
  `    await testInstance.mutation(api.tags.remove, {\n      actor,\n      tagId: revenueTagId,\n    });\n\n    const stored = await testInstance.run((ctx) =>`,
  `    await testInstance.mutation(api.tags.remove, {\n      actor,\n      tagId: revenueTagId,\n    });\n\n    vi.useFakeTimers();\n    try {\n      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);\n    } finally {\n      vi.useRealTimers();\n    }\n\n    const stored = await testInstance.run((ctx) =>`,
);

replaceExact(
  `    await testInstance.mutation(api.roadmap.remove, {\n      actor,\n      roadmapId: firstId,\n    });\n    const storedEntry = await testInstance.run((ctx) =>`,
  `    await testInstance.mutation(api.roadmap.remove, {\n      actor,\n      roadmapId: firstId,\n    });\n    vi.useFakeTimers();\n    try {\n      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);\n    } finally {\n      vi.useRealTimers();\n    }\n    const storedEntry = await testInstance.run((ctx) =>`,
);

const insertionPoint = `  test("admin inbox and roadmap lists use cursor pagination", async () => {`;
if (!content.includes(insertionPoint)) {
  throw new Error("Pagination test insertion point not found");
}

const batchTest = `  test("tag and roadmap deletion self-schedule beyond 100 entries", async () => {\n    const testInstance = setup();\n    const actor = { id: "admin-1", isAdmin: true } as const;\n    const tagId = await testInstance.mutation(api.tags.create, {\n      actor,\n      name: "Bulk cleanup",\n    });\n    const roadmapId = await testInstance.mutation(api.roadmap.create, {\n      actor,\n      title: "Bulk cleanup roadmap",\n      status: "planned",\n    });\n\n    const entryIds = await testInstance.run(async (ctx) => {\n      const ids: Id<"entries">[] = [];\n      for (let index = 0; index < 101; index += 1) {\n        ids.push(\n          await ctx.db.insert("entries", {\n            actorId: "bulk-author-" + index,\n            kind: "feedback",\n            status: "open",\n            statusFilter: "open",\n            title: "Bulk entry " + index,\n            body: "Bulk cleanup body",\n            normalizedTitle: "bulk entry " + index,\n            searchText: "Bulk entry " + index + "\\nBulk cleanup body",\n            upvoteCount: 0,\n            commentCount: 0,\n            tagIds: [tagId],\n            roadmapId,\n          }),\n        );\n      }\n      await ctx.db.patch("roadmap", roadmapId, { feedbackCount: ids.length });\n      return ids;\n    });\n\n    await testInstance.mutation(api.tags.remove, { actor, tagId });\n    await testInstance.mutation(api.roadmap.remove, { actor, roadmapId });\n\n    const pending = await testInstance.run(async (ctx) => ({\n      tag: await ctx.db.get("tags", tagId),\n      roadmap: await ctx.db.get("roadmap", roadmapId),\n    }));\n    expect(pending.tag?.deletingAt).toEqual(expect.any(Number));\n    expect(pending.roadmap?.deletingAt).toEqual(expect.any(Number));\n\n    vi.useFakeTimers();\n    try {\n      await testInstance.finishAllScheduledFunctions(vi.runAllTimers);\n    } finally {\n      vi.useRealTimers();\n    }\n\n    const cleaned = await testInstance.run(async (ctx) => ({\n      tag: await ctx.db.get("tags", tagId),\n      roadmap: await ctx.db.get("roadmap", roadmapId),\n      entries: await Promise.all(entryIds.map((entryId) => ctx.db.get("entries", entryId))),\n    }));\n    expect(cleaned.tag).toBeNull();\n    expect(cleaned.roadmap).toBeNull();\n    expect(\n      cleaned.entries.every(\n        (entry) =>\n          entry !== null &&\n          !entry.tagIds?.includes(tagId) &&\n          entry.roadmapId === undefined,\n      ),\n    ).toBe(true);\n  });\n\n`;

content = content.replace(insertionPoint, batchTest + insertionPoint);
writeFileSync(path, content);
console.log("Applied slice 3 deletion tests.");
