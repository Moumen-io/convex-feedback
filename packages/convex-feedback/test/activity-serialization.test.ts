import { describe, expect, test } from "vitest";

import type { Doc, Id } from "../src/component/_generated/dataModel.js";
import {
  serializeActivityComment,
  serializeActivityReaction,
} from "../src/component/helpers.js";

const entryId = "entry-1" as Id<"entries">;
const commentId = "comment-1" as Id<"comments">;
const reactionId = "reaction-1" as Id<"reactions">;

const entry = {
  _id: entryId,
  _creationTime: 1,
  actorId: "entry-author",
  kind: "feature_request" as const,
  status: "open" as const,
  statusFilter: "open" as const,
  title: "Loaded entry",
  body: "Entry body",
  normalizedTitle: "loaded entry",
  searchText: "Loaded entry Entry body",
  upvoteCount: 1,
  commentCount: 1,
} satisfies Doc<"entries">;

const comment = {
  _id: commentId,
  _creationTime: 2,
  entryId,
  actorId: "comment-author",
  depth: 0,
  body: "Loaded comment",
  likeCount: 1,
  replyCount: 0,
} satisfies Doc<"comments">;

describe("activity target serialization", () => {
  test("serializes already-loaded targets without another database read", () => {
    const activityComment = serializeActivityComment(comment, entry);
    const activityReaction = serializeActivityReaction(
      {
        _id: reactionId,
        _creationTime: 3,
        actorId: "activity-author",
        commentId,
      } satisfies Doc<"reactions">,
      { type: "comment", comment, entry },
    );

    expect(activityComment).toMatchObject({
      id: commentId,
      entryTitle: "Loaded entry",
      body: "Loaded comment",
    });
    expect(activityReaction).toMatchObject({
      type: "comment_like",
      comment: {
        id: commentId,
        entryTitle: "Loaded entry",
        body: "Loaded comment",
      },
    });
  });
});
