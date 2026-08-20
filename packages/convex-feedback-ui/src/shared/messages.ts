import type { FeedbackMessageOverrides, FeedbackMessages } from "./types";

export const englishFeedbackMessages: FeedbackMessages = {
  board: {
    title: "Feedback",
    subtitle: "Share ideas, report problems, and help shape what comes next.",
    searchPlaceholder: "Search feedback…",
    createEntry: "Create feedback",
    noEntries: "No feedback yet.",
    noSearchResults: "No matching feedback found.",
    loading: "Loading…",
    loadMore: "Load more",
  },
  kinds: {
    feedback: "Feedback",
    feature_request: "Feature request",
    bug_report: "Bug report",
  },
  kindsPlural: {
    feedback: "Feedback",
    feature_request: "Feature requests",
    bug_report: "Bug reports",
  },
  newFeedback: {
    feedback: "New feedback",
    feature_request: "New feature request",
    bug_report: "New bug report",
  },
  statuses: {
    open: "Open",
    under_review: "Under review",
    planned: "Planned",
    in_progress: "In progress",
    completed: "Completed",
    closed: "Closed",
  },
  entry: {
    upvote: "Upvote",
    removeUpvote: "Remove upvote",
    comments: (count) => `${count} ${count === 1 ? "comment" : "comments"}`,
    open: "Open",
    back: "Go back",
  },
  form: {
    kind: "Type",
    title: "Title",
    titlePlaceholder: "Summarize your feedback",
    body: "Details",
    bodyPlaceholder: "Tell us more…",
    submit: "Submit feedback",
    cancel: "Cancel",
    possibleDuplicates: "Possible existing feedback",
    exactDuplicate: "This may already exist",
    duplicateWarning:
      "Similar feedback already exists. Are you sure you want to submit another entry?",
    submitAnyway: "Submit anyways",
  },
  comments: {
    title: "Discussion",
    placeholder: "Add a comment…",
    submit: "Comment",
    reply: "Reply",
    cancelReply: "Cancel reply",
    like: "Like",
    unlike: "Unlike",
    viewReplies: (count) =>
      `View ${count} ${count === 1 ? "reply" : "replies"}`,
    hideReplies: "Hide replies",
    deleted: "Comment deleted",
    noComments: "No comments yet.",
    loadMore: "Load more comments",
  },
};

export function mergeFeedbackMessages(
  overrides: FeedbackMessageOverrides = {},
): FeedbackMessages {
  return {
    board: { ...englishFeedbackMessages.board, ...overrides.board },
    kinds: {
      ...englishFeedbackMessages.kinds,
      ...overrides.kinds,
    },
    kindsPlural: {
      ...englishFeedbackMessages.kindsPlural,
      ...overrides.kindsPlural,
    },
    newFeedback: {
      ...englishFeedbackMessages.newFeedback,
      ...overrides.newFeedback,
    },
    statuses: {
      ...englishFeedbackMessages.statuses,
      ...overrides.statuses,
    },
    entry: { ...englishFeedbackMessages.entry, ...overrides.entry },
    form: { ...englishFeedbackMessages.form, ...overrides.form },
    comments: { ...englishFeedbackMessages.comments, ...overrides.comments },
  };
}
