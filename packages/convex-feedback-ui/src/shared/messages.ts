import type { EntryKind, EntryStatus } from "convex-feedback";

export interface FeedbackMessages {
  board: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    createEntry: string;
    noEntries: string;
    noSearchResults: string;
    loading: string;
    loadMore: string;
  };
  kinds: Record<EntryKind, string>;
  statuses: Record<EntryStatus, string>;
  entry: {
    upvote: string;
    removeUpvote: string;
    comments: (count: number) => string;
    open: string;
    back: string;
  };
  form: {
    kind: string;
    title: string;
    titlePlaceholder: string;
    body: string;
    bodyPlaceholder: string;
    submit: string;
    cancel: string;
    possibleDuplicates: string;
    exactDuplicate: string;
  };
  comments: {
    title: string;
    placeholder: string;
    submit: string;
    reply: string;
    cancelReply: string;
    like: string;
    unlike: string;
    viewReplies: (count: number) => string;
    hideReplies: string;
    deleted: string;
    noComments: string;
    loadMore: string;
  };
}

export interface FeedbackMessageOverrides {
  board?: Partial<FeedbackMessages["board"]>;
  kinds?: Partial<FeedbackMessages["kinds"]>;
  statuses?: Partial<FeedbackMessages["statuses"]>;
  entry?: Partial<FeedbackMessages["entry"]>;
  form?: Partial<FeedbackMessages["form"]>;
  comments?: Partial<FeedbackMessages["comments"]>;
}

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
    back: "Back to feedback",
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
      feedback:
        overrides.kinds?.feedback ?? englishFeedbackMessages.kinds.feedback,
      feature_request:
        overrides.kinds?.feature_request ??
        englishFeedbackMessages.kinds.feature_request,
      bug_report:
        overrides.kinds?.bug_report ?? englishFeedbackMessages.kinds.bug_report,
    },
    statuses: {
      open: overrides.statuses?.open ?? englishFeedbackMessages.statuses.open,
      under_review:
        overrides.statuses?.under_review ??
        englishFeedbackMessages.statuses.under_review,
      planned:
        overrides.statuses?.planned ?? englishFeedbackMessages.statuses.planned,
      in_progress:
        overrides.statuses?.in_progress ??
        englishFeedbackMessages.statuses.in_progress,
      completed:
        overrides.statuses?.completed ??
        englishFeedbackMessages.statuses.completed,
      closed:
        overrides.statuses?.closed ?? englishFeedbackMessages.statuses.closed,
    },
    entry: { ...englishFeedbackMessages.entry, ...overrides.entry },
    form: { ...englishFeedbackMessages.form, ...overrides.form },
    comments: { ...englishFeedbackMessages.comments, ...overrides.comments },
  };
}
