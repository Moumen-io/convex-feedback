import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  entryKindValidator,
  entryPriorityValidator,
  entryStatusFilterValidator,
  entryStatusValidator,
  feedbackMetadataValidator,
  roadmapStatusValidator,
} from "./model.js";

const schema = defineSchema({
  entries: defineTable({
    actorId: v.string(),
    kind: entryKindValidator,
    status: entryStatusValidator,
    statusFilter: v.optional(entryStatusFilterValidator),
    title: v.string(),
    body: v.string(),
    normalizedTitle: v.string(),
    searchText: v.string(),
    upvoteCount: v.number(),
    commentCount: v.number(),
    updatedAt: v.optional(v.number()),
    metadata: v.optional(feedbackMetadataValidator),
    priority: v.optional(entryPriorityValidator),
    roadmapId: v.optional(v.id("roadmap")),
  })
    .index("by_kind", ["kind"])
    .index("by_status", ["status"])
    .index("by_kind_status", ["kind", "status"])
    .index("by_status_filter", ["statusFilter"])
    .index("by_kind_status_filter", ["kind", "statusFilter"])
    .index("by_upvotes", ["upvoteCount"])
    .index("by_kind_upvotes", ["kind", "upvoteCount"])
    .index("by_status_upvotes", ["status", "upvoteCount"])
    .index("by_kind_status_upvotes", ["kind", "status", "upvoteCount"])
    .index("by_status_filter_upvotes", ["statusFilter", "upvoteCount"])
    .index("by_kind_status_filter_upvotes", [
      "kind",
      "statusFilter",
      "upvoteCount",
    ])
    .index("by_normalized_title", ["normalizedTitle"])
    .index("by_kind_normalized_title", ["kind", "normalizedTitle"])
    .index("by_priority", ["priority"])
    .index("by_roadmap_id", ["roadmapId"])
    .searchIndex("search", {
      searchField: "searchText",
      filterFields: ["kind", "status", "statusFilter", "priority"],
    }),

  roadmap: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: roadmapStatusValidator,
    position: v.number(),
    feedbackCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletingAt: v.optional(v.number()),
    rebalanceId: v.optional(v.string()),
    rebalanceRank: v.optional(v.number()),
    rebalancePosition: v.optional(v.number()),
  })
    .index("by_status_and_position", ["status", "position"])
    .index("by_status_deleting_at_position", [
      "status",
      "deletingAt",
      "position",
    ])
    .index("by_deleting_at_and_position", ["deletingAt", "position"])
    .index("by_status_rebalance_rank", [
      "status",
      "rebalanceId",
      "rebalanceRank",
    ])
    .index("by_status_deleting_at_rebalance_id_position", [
      "status",
      "deletingAt",
      "rebalanceId",
      "rebalancePosition",
    ])
    .index("by_position", ["position"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "deletingAt"],
    }),

  roadmapRebalances: defineTable({
    status: roadmapStatusValidator,
    nextGeneration: v.number(),
    visibleGeneration: v.optional(v.string()),
    activeGeneration: v.optional(v.string()),
  }).index("by_status", ["status"]),

  comments: defineTable({
    entryId: v.id("entries"),
    parentCommentId: v.optional(v.id("comments")),
    actorId: v.string(),
    depth: v.number(),
    body: v.string(),
    likeCount: v.number(),
    replyCount: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_entry_parent", ["entryId", "parentCommentId"])
    .index("by_entry_parent_likes", [
      "entryId",
      "parentCommentId",
      "likeCount",
    ]),

  reactions: defineTable({
    actorId: v.string(),
    entryId: v.optional(v.id("entries")),
    commentId: v.optional(v.id("comments")),
  })
    .index("by_entry_actor", ["entryId", "actorId"])
    .index("by_comment_actor", ["commentId", "actorId"]),
});

export default schema;
