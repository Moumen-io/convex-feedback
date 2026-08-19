import type { FeedbackComment } from "convex-feedback";

import type { RenderChildren } from "./render.js";

/**
 * Platform-neutral props shared by `Comment.Root` implementations.
 */
export interface CommentRootBaseProps {
  /** Comment exposed to every nested `Comment.*` primitive. */
  comment: FeedbackComment;
}

/**
 * State and actions exposed to a custom `Comment.Like` renderer.
 */
export interface CommentLikeState {
  /** Current comment. */
  comment: FeedbackComment;

  /** Whether the current viewer currently likes the comment. */
  active: boolean;

  /** Current total like count. */
  count: number;

  /** Requests the opposite of the current like state. */
  toggle: () => void | Promise<void>;
}

/**
 * Platform-neutral props shared by `Comment.Like` implementations.
 */
export interface CommentLikeBaseProps {
  /**
   * Called with the desired final like state.
   *
   * `true` ensures the viewer likes the comment. `false` ensures the viewer
   * does not like it. The server mutation is idempotent rather than toggle-
   * based.
   */
  onToggle: (desiredState: boolean) => void | Promise<void>;

  /**
   * Normal children replace the default content. A render-function child
   * replaces the complete control and receives `CommentLikeState`.
   */
  children?: RenderChildren<CommentLikeState> | undefined;
}

/**
 * State exposed to simple comment action renderers such as `Comment.Reply`.
 */
export interface CommentActionState {
  /** Current comment. */
  comment: FeedbackComment;

  /** Activates the action. */
  activate: () => void;
}

/**
 * Platform-neutral props shared by simple comment action primitives.
 */
export interface CommentActionBaseProps {
  /** Called when the action is activated. */
  onActivate: () => void;

  /**
   * Normal children replace the default content. A render-function child
   * replaces the complete control and receives `CommentActionState`.
   */
  children?: RenderChildren<CommentActionState> | undefined;
}

/**
 * State exposed to a custom lazy-replies control.
 */
export interface RepliesButtonState extends CommentActionState {
  /** Whether this direct-reply branch is currently expanded. */
  expanded: boolean;

  /** Number of direct replies available for the comment. */
  count: number;
}

/**
 * Platform-neutral props shared by `Comment.RepliesButton` implementations.
 */
export interface RepliesButtonBaseProps {
  /** Whether direct replies are currently displayed. */
  expanded: boolean;

  /** Requests a new expanded/collapsed state. */
  onExpandedChange: (expanded: boolean) => void;

  /**
   * Normal children replace the default content. A render-function child
   * replaces the complete control and receives `RepliesButtonState`.
   */
  children?: RenderChildren<RepliesButtonState> | undefined;
}
