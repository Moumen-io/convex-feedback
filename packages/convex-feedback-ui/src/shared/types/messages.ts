import type { EntryKind, EntryStatus } from "convex-feedback";

/**
 * Localizable package-owned UI copy used by both React DOM and React Native.
 *
 * User-generated entry and comment content is never translated or rewritten
 * by the UI package.
 */
export interface FeedbackMessages {
  /** Feedback-board copy. */
  board: {
    /** Main board heading. */
    title: string;

    /** Supporting copy shown near the board heading. */
    subtitle: string;

    /** Search input placeholder. */
    searchPlaceholder: string;

    /** CTA for opening the create-entry flow.
     * This is shown when enabled kinds are two or more.
     * Use messages.newFeedback for a single-kind entry.
     */
    createEntry: string;

    /** Empty-state copy when no entries exist. */
    noEntries: string;

    /** Empty-state copy when a search produces no results. */
    noSearchResults: string;

    /** Generic loading copy. */
    loading: string;

    /** Entry pagination CTA. */
    loadMore: string;
  };

  /** Localized display labels for each fixed entry kind. */
  kinds: Record<EntryKind, string>;

  /** Localized plural display labels for each fixed entry kind. */
  kindsPlural: Record<EntryKind, string>;

  /** Localized display labels for creating a new entry. */
  newFeedback: Record<EntryKind, string>;

  /** Localized display labels for each fixed workflow status. */
  statuses: Record<EntryStatus, string>;

  /** Entry-level action and counter copy. */
  entry: {
    /** Accessible/default label for adding an upvote. */
    upvote: string;

    /** Accessible/default label for removing an upvote. */
    removeUpvote: string;

    /** Formats the total comment count. */
    comments: (count: number) => string;

    /** Label for opening an entry. */
    open: string;

    /** Label for returning to the feedback list. */
    back: string;
  };

  /** Moderator-only diagnostic metadata copy. */
  metadata: {
    /** Action that opens the metadata viewer. */
    view: string;

    /** Metadata viewer heading. */
    title: string;

    /** Heading for automatically collected values. */
    standard: string;

    /** Heading for host-provided values. */
    additional: string;

    /** Empty state for a metadata object without values. */
    empty: string;

    /** Closes the metadata viewer. */
    close: string;
  };

  /** Create-entry form copy. */
  form: {
    /** Entry-kind field label. */
    kind: string;

    /** Entry-title field label. */
    title: string;

    /** Entry-title placeholder. */
    titlePlaceholder: string;

    /** Entry-body field label. */
    body: string;

    /** Entry-body placeholder. */
    bodyPlaceholder: string;

    /** Create-entry submit CTA. */
    submit: string;

    /** Generic form/dialog cancel action. */
    cancel: string;

    /** Heading shown when likely duplicate entries are found. */
    possibleDuplicates: string;

    /** Heading shown when an exact normalized-title match exists. */
    exactDuplicate: string;

    /** Warning shown before submitting while duplicate suggestions exist. */
    duplicateWarning: string;

    /** Confirmation action that submits despite duplicate suggestions. */
    submitAnyway: string;
  };

  /** Comment-thread copy. */
  comments: {
    /** Discussion/thread heading. */
    title: string;

    /** Comment/reply input placeholder. */
    placeholder: string;

    /** Top-level comment submit action. */
    submit: string;

    /** Reply action. */
    reply: string;

    /** Cancels an in-progress reply. */
    cancelReply: string;

    /** Adds a comment like. */
    like: string;

    /** Removes a comment like. */
    unlike: string;

    /** Formats the lazy-load-replies action for a direct-reply count. */
    viewReplies: (count: number) => string;

    /** Collapses an expanded reply branch. */
    hideReplies: string;

    /** Placeholder copy for a soft-deleted comment. */
    deleted: string;

    /** Empty-state copy when no comments exist. */
    noComments: string;

    /** Comment/reply pagination CTA. */
    loadMore: string;
  };
}

/**
 * Partial localization/copy overrides for the feedback UI.
 *
 * Values not supplied here fall back to the package's built-in English copy.
 */
export interface FeedbackMessageOverrides {
  /** Board copy overrides. */
  board?: Partial<FeedbackMessages["board"]> | undefined;

  /** Entry-kind label overrides. */
  kinds?: Partial<FeedbackMessages["kinds"]> | undefined;

  /** Entry-kind plural label overrides. */
  kindsPlural?: Partial<FeedbackMessages["kindsPlural"]> | undefined;

  /** Create single entry copy overrides. */
  newFeedback?: Partial<FeedbackMessages["newFeedback"]> | undefined;

  /** Workflow-status label overrides. */
  statuses?: Partial<FeedbackMessages["statuses"]> | undefined;

  /** Entry action/counter copy overrides. */
  entry?: Partial<FeedbackMessages["entry"]> | undefined;

  /** Diagnostic metadata copy overrides. */
  metadata?: Partial<FeedbackMessages["metadata"]> | undefined;

  /** Create-entry form copy overrides. */
  form?: Partial<FeedbackMessages["form"]> | undefined;

  /** Comment-thread copy overrides. */
  comments?: Partial<FeedbackMessages["comments"]> | undefined;
}
