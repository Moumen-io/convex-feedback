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
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) return null;

    return {
      id: identity.tokenIdentifier,
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
