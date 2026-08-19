import { getAuthUserId } from "@convex-dev/auth/server";
import { exposeFeedbackApi } from "convex-feedback";

import { components } from "./_generated/api";

export const {
  listEntries,
  getEntry,
  searchEntries,
  findSimilarEntries,
  createEntry,
  updateEntry,
  setEntryStatus,
  setEntryUpvote,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  setCommentLike,
} = exposeFeedbackApi(components.feedback, {
  actor: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId === null
      ? null
      : {
          id: String(userId),
          isModerator: false,
        };
  },
  config: {
    comments: {
      maxDepth: 5,
      defaultSort: "top",
    },
  },
});
