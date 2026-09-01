import { createFeedbackHooks } from "convex-feedback/react";
import { api } from "convex-feedback-example-backend/api";

export const feedbackHooks = createFeedbackHooks(api.feedback, {
  entryPageSize: 20,
  commentPageSize: 20,
  replyPageSize: 10,
});
