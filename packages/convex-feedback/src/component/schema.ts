import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  entryKindValidator,
  entryStatusValidator,
  feedbackMetadataValidator,
} from "./model.js";

const schema = defineSchema({
  entries: defineTable({
    actorId: v.string(),
    kind: entryKindValidator,
    status: entryStatusValidator,
    title: v.string(),
    body: v.string(),
    normalizedTitle: v.string(),
    searchText: v.string(),
    upvoteCount: v.number(),
    commentCount: v.number(),
    updatedAt: v.optional(v.number()),
    metadata: v.optional(feedbackMetadataValidator),
  })
    .index("by_kind", ["kind"])
    .index("by_status", ["status"])
    .index("by_kind_status", ["kind", "status"])
    .index("by_upvotes", ["upvoteCount"])
    .index("by_kind_upvotes", ["kind", "upvoteCount"])
    .index("by_status_upvotes", ["status", "upvoteCount"])
    .index("by_kind_status_upvotes", ["kind", "status", "upvoteCount"])
    .index("by_normalized_title", ["normalizedTitle"])
    .index("by_kind_normalized_title", ["kind", "normalizedTitle"])
    .searchIndex("search", {
      searchField: "searchText",
      filterFields: ["kind", "status"],
    }),

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
