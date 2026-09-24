import type { CommentSort } from "convex-feedback";
import type { FeedbackHooks } from "convex-feedback/react";

import type { FeedbackColorProps, FeedbackProviderProps } from "./context.js";
import type {
  FeedbackCommentTransform,
  FeedbackActorRenderer,
  FeedbackUnauthenticatedHandler,
} from "./screen.js";

/** Shared props for the public roadmap screen implementations. */
export interface RoadmapScreenProps
  extends
    FeedbackColorProps,
    Pick<FeedbackProviderProps, "messages" | "theme" | "unstyled"> {
  /** Hooks created with `createFeedbackHooks`. */
  hooks: FeedbackHooks;

  /** Called when an attached entry is opened. */
  onEntryOpen?: (entryId: string) => void;

  /** Called when a visitor tries an authenticated-only action anonymously. */
  onUnauthenticated?: FeedbackUnauthenticatedHandler;

  /** Server-side ordering used when displaying comments on an attached entry. */
  commentSort?: CommentSort;

  /** Maximum depth exposed when an attached entry's discussion is opened. */
  maxCommentDepth?: number;

  /** Presentation-only transform applied to loaded comments. */
  transformComments?: FeedbackCommentTransform;

  /** Optional host renderer for actor information in comments. */
  renderActor?: FeedbackActorRenderer;

  /** Number of roadmap items initially requested. */
  pageSize?: number;

  /** Number of attached entries initially requested. */
  entryPageSize?: number;
}
