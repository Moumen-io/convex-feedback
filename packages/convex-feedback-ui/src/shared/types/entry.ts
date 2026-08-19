import type { FeedbackEntry } from "convex-feedback";

import type { RenderChildren } from "./render.js";

/**
 * Platform-neutral props shared by `FeedbackEntry.Root` implementations.
 */
export interface EntryRootBaseProps {
  /** Entry exposed to every nested `FeedbackEntry.*` primitive. */
  entry: FeedbackEntry;
}

/**
 * State and actions exposed to a custom `FeedbackEntry.Upvote` renderer.
 */
export interface EntryUpvoteState {
  /** Current entry. */
  entry: FeedbackEntry;

  /** Whether the current viewer has upvoted the entry. */
  active: boolean;

  /** Current total upvote count. */
  count: number;

  /** Requests the opposite of the current upvote state. */
  toggle: () => void | Promise<void>;
}

/**
 * Platform-neutral props shared by `FeedbackEntry.Upvote` implementations.
 */
export interface EntryUpvoteBaseProps {
  /**
   * Called with the desired final upvote state.
   *
   * `true` means ensure the viewer has upvoted the entry. `false` means ensure
   * the viewer has not upvoted it. The server mutation is state-setting rather
   * than toggle-based so it remains idempotent.
   */
  onToggle: (desiredState: boolean) => void | Promise<void>;

  /**
   * Normal children replace the default content. A render-function child
   * replaces the complete control and receives `EntryUpvoteState`.
   */
  children?: RenderChildren<EntryUpvoteState> | undefined;
}
