import type { FeedbackHooks } from "convex-feedback/react";

import type { FeedbackColorProps, FeedbackProviderProps } from "./context.js";
import type { FeedbackUnauthenticatedHandler } from "./screen.js";

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

  /** Number of roadmap items initially requested. */
  pageSize?: number;

  /** Number of attached entries initially requested. */
  entryPageSize?: number;
}
