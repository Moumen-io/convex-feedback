import type {
  CommentSort,
  EntryKind,
  EntrySort,
  EntryStatusFilter,
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

/** Called when an authenticated-only UI action is requested anonymously. */
export type FeedbackUnauthenticatedHandler = () => void;

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
   * Called when an unauthenticated visitor tries to create, edit, vote, like,
   * or comment. The host decides how to present authentication.
   */
  onUnauthenticated?: FeedbackUnauthenticatedHandler;

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

  /** Optional host-owned content rendered above the empty-state message. */
  emptyState?: ReactNode;

  /** Optional host-owned loading indicator rendered during board loading. */
  loading?: ReactNode;
}

export interface FeedbackScreenRootProps
  extends
    Omit<FeedbackProviderProps, "children">,
    FeedbackColorProps,
    FeedbackScreenBaseProps,
    FeedbackScreenTransformationProps {}

export interface FeedbackScreenProviderProps
  extends
    Required<
      Omit<
        FeedbackScreenBaseProps,
        "collectMetadata" | "emptyState" | "loading" | "onUnauthenticated"
      >
    >,
    FeedbackScreenTransformationProps {
  onUnauthenticated?: FeedbackUnauthenticatedHandler;
  collectMetadata?: CollectMetadata;
  emptyState?: ReactNode;
  loading?: ReactNode;
  collectStandardMetadata: StandardMetadataCollector;
}

export interface FeedbackScreenBodyContextValue
  extends FeedbackScreenTransformationProps, FeedbackScreenProviderProps {
  isAuthenticated: boolean | undefined;
  query: string;
  debouncedQuery: string;
  showForm: boolean;
  isSearching: boolean;
  selectedEntryId: string | null;
  statusFilter: EntryStatusFilter;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setDebouncedQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedEntryId: React.Dispatch<React.SetStateAction<string | null>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<EntryStatusFilter>>;
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
  /** Whether provider-selected entries are rendered in place of the list.
   * @default true
   */
  showSelectedEntry?: boolean;

  /** Hide the inline edit action when the host renders it elsewhere. */
  hideEditButton?: boolean;

  /** Callback for the empty-state create-entry action. */
  onCreateEntry?: () => void;
}

export interface FeedbackScreenContentProps
  extends FeedbackColorProps, Partial<FeedbackScreenListProps> {}

export interface FeedbackScreenEntryCardProps {
  entry: FeedbackEntry;
  hooks: FeedbackHooks;
  /** Callback when the EntryCard is opened. */
  onOpen: () => void;
  /** Optional line limit for the entry title in compact lists. */
  titleNumberOfLines?: number;
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

  /** Hide the inline edit action when the host renders it elsewhere. */
  hideEditButton?: boolean;
}

export interface FeedbackScreenCommentBranchProps extends FeedbackScreenEntryBaseProps {
  comment: FeedbackComment;
}

export interface FeedbackScreenReplyListProps extends FeedbackScreenEntryBaseProps {
  /** The parent comment ID of the reply list. */
  parentCommentId: string;
}
