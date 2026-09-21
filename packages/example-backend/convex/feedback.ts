import { exposeFeedbackApi } from "convex-feedback";

import { v } from "convex/values";
import { api, components } from "./_generated/api";

export const {
  isAdmin,
  isAuthenticated,
  listEntries,
  getEntry,
  searchEntries,
  findSimilarEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  setEntryStatus,
  adminListEntries,
  adminGetEntry,
  adminSearchEntries,
  setEntryPriority,
  listUserEntries,
  listRoadmap,
  getRoadmapItem,
  searchRoadmap,
  createRoadmap,
  createRoadmapForEntry,
  updateRoadmap,
  deleteRoadmap,
  moveRoadmapItem,
  attachFeedbackToRoadmap,
  detachFeedbackFromRoadmap,
  listRoadmapFeedback,
  setEntryUpvote,
  listComments,
  listUserComments,
  listUserReactions,
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
      isAdmin: true,
    };
  },
  config: {
    comments: {
      maxDepth: 5,
      defaultSort: "top",
    },
  },
});
