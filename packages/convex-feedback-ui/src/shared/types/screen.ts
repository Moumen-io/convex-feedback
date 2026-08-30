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
import type { CollectMetadata } from "./metadata.js";
import type { StandardMetadataCollector } from "../metadata.js";

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

export interface FeedbackScreenTransformationProps {
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

export interface FeedbackScreenBaseProps {
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
   * Duration in milliseconds to wait before triggering a search.
   *
   * @default 300
   */
  debounceDuration?: number;

  /**
   * Enables creation-time diagnostic metadata collection globally and/or by
   * entry kind. Disabled by default.
   */
  collectMetadata?: CollectMetadata;
}

export interface FeedbackScreenRootProps
  extends
    Omit<FeedbackProviderProps, "children">,
    FeedbackColorProps,
    FeedbackScreenBaseProps,
    FeedbackScreenTransformationProps {}

export interface FeedbackScreenProviderProps
  extends
    Required<Omit<FeedbackScreenBaseProps, "collectMetadata">>,
    FeedbackScreenTransformationProps {
  collectMetadata?: CollectMetadata;
  collectStandardMetadata: StandardMetadataCollector;
}

export interface FeedbackScreenBodyContextValue
  extends FeedbackScreenTransformationProps, FeedbackScreenProviderProps {
  query: string;
  debouncedQuery: string;
  showForm: boolean;
  isSearching: boolean;
  selectedEntryId: string | null;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setDebouncedQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedEntryId: React.Dispatch<React.SetStateAction<string | null>>;
}

export type FeedbackScreenBodyProps = FeedbackColorProps;

export interface FeedbackScreenListProps {
  /** Whether to show the header.
   *  @default true
   */
  showHeader?: boolean;
  /** Whether to hide the back button from the EntryCard.
   *  @default false
   */
  hideBackButton?: boolean;
  /** Callback when the EntryCard is opened. */
  onEntryOpen: (entryId: string) => void;
}

export interface FeedbackScreenContentProps
  extends FeedbackColorProps, Partial<FeedbackScreenListProps> {}

export interface FeedbackScreenEntryCardProps {
  entry: FeedbackEntry;
  hooks: FeedbackHooks;
  /** Callback when the EntryCard is opened. */
  onOpen: () => void;
}

export interface FeedbackScreenEntryModalProps {
  /** Callback when an entry is created. */
  onCreated: (id: string) => void;
}

export interface FeedbackScreenEntryBaseProps {
  /** The entry ID to open. */
  entryId: string;
}

export interface FeedbackScreenEntryDetailProps extends FeedbackScreenEntryBaseProps {
  /** Whether to hide the back button from the EntryCard.
   *  @default false
   */
  hideBackButton?: boolean;
  /** Callback when the EntryCard is closed. */
  onBack: () => void;
}

export interface FeedbackScreenCommentBranchProps extends FeedbackScreenEntryBaseProps {
  comment: FeedbackComment;
}

export interface FeedbackScreenReplyListProps extends FeedbackScreenEntryBaseProps {
  /** The parent comment ID of the reply list. */
  parentCommentId: string;
}
