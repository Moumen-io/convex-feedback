import { exposeFeedbackApi } from "convex-feedback";

import { components } from "./_generated/api";

export const {
  isAdmin,
  listEntries,
  getEntry,
  searchEntries,
  findSimilarEntries,
  createEntry,
  updateEntry,
  setEntryStatus,
  adminListEntries,
  adminGetEntry,
  adminSearchEntries,
  setEntryPriority,
  listTags,
  createTag,
  updateTag,
  deleteTag,
  attachTag,
  detachTag,
  listRoadmap,
  searchRoadmap,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
  moveRoadmapItem,
  attachFeedbackToRoadmap,
  detachFeedbackFromRoadmap,
  listRoadmapFeedback,
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
      isAdmin: false,
    };
  },
  config: {
    comments: {
      maxDepth: 5,
      defaultSort: "top",
    },
  },
});
