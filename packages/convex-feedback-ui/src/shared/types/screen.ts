import type {
  CommentSort,
  EntryKind,
  EntrySort,
  FeedbackComment,
  FeedbackEntry,
} from "convex-feedback";
import type { FeedbackHooks } from "convex-feedback/react";
import type { ReactNode } from "react";

import type { FeedbackColorProps, FeedbackProviderProps } from "./context.js";
import type { Require } from "./helpers.js";

/**
 * Presentation-only transform applied to one currently loaded comment page.
 *
 * This does not affect Convex ordering, pagination, or which descendants are
 * loaded. It is intended only for host-specific presentation transforms.
 */
export type FeedbackCommentTransform = (
  comments: readonly FeedbackComment[],
) => readonly FeedbackComment[];

/**
 * Host renderer for actor information associated with entries/comments.
 *
 * The feedback component stores only stable actor IDs; profile data remains
 * owned by the host application.
 */
export type FeedbackActorRenderer = (actorId: string) => ReactNode;

export interface FeedbackScreenBaseProps extends FeedbackColorProps {
  /** Hooks created with `createFeedbackHooks`. */
  hooks: FeedbackHooks;

  /**
   * Server-side ordering used by the feedback board.
   *
   * @default "top"
   */
  entrySort?: EntrySort;

  /**
   * Server-side ordering used independently at every loaded comment/reply
   * level.
   *
   * @default "top"
   */
  commentSort?: CommentSort;

  /**
   * Entry kinds visible in the board/search and available in the create form.
   *
   * The prebuilt screen passes these kinds into the Convex list/search queries;
   * filtering must not be performed after pagination on the client.
   *
   * @default ["feedback", "feature_request", "bug_report"]
   */
  enabledKinds?: readonly EntryKind[];

  /**
   * Maximum nesting depth for which the prebuilt UI exposes a Reply action.
   *
   * The server-side component configuration remains authoritative and may
   * reject a reply if this value exceeds the configured backend maximum.
   *
   * @default 5
   */
  maxCommentDepth?: number;

  /**
   * Optional presentation-only transform applied to each loaded page of
   * comments/replies before rendering.
   */
  transformComments?: FeedbackCommentTransform;

  /**
   * Optional host renderer for actor IDs, useful for names, avatars, or other
   * host-owned profile information.
   */
  renderActor?: FeedbackActorRenderer;
}

export interface FeedbackScreenRootProps
  extends Omit<FeedbackProviderProps, "children">, FeedbackScreenBaseProps {}

export type FeedbackScreenBodyProps = Require<
  FeedbackScreenBaseProps,
  "entrySort" | "commentSort" | "enabledKinds" | "maxCommentDepth"
>;

export interface FeedbackScreenEntryCardProps {
  entry: FeedbackEntry;
  hooks: FeedbackHooks;
  onOpen: () => void;
}

export interface FeedbackScreenEntryModalProps {
  hooks: FeedbackHooks;
  enabledKinds: readonly EntryKind[];
  onCreated: (id: string) => void;
}

export interface FeedbackScreenEntryBaseProps {
  entryId: string;
  hooks: FeedbackHooks;
  commentSort: CommentSort;
  maxCommentDepth: number;
  transformComments?: FeedbackScreenBaseProps["transformComments"];
  renderActor?: FeedbackScreenBaseProps["renderActor"];
}

export interface FeedbackScreenEntryDetailProps extends FeedbackScreenEntryBaseProps {
  onBack: () => void;
}

export interface FeedbackScreenCommentBranchProps extends FeedbackScreenEntryBaseProps {
  comment: FeedbackComment;
}

export interface FeedbackScreenReplyListProps extends FeedbackScreenEntryBaseProps {
  parentCommentId: string;
}
