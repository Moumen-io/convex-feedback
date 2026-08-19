import type { FeedbackColorProps } from "./context.js";
import type { RenderChildren } from "./render.js";

/**
 * Platform-neutral props shared by `FeedbackBoard.Root` implementations.
 *
 * Platform-specific root props extend this interface with their native host
 * element props (`HTMLAttributes` on web and `ViewProps` on React Native).
 */
export interface BoardRootBaseProps extends FeedbackColorProps {
  /**
   * Overrides provider-level `unstyled` for this board.
   */
  unstyled?: boolean;
}

/**
 * State supplied to a custom `FeedbackBoard.Search` render-function child.
 */
export interface BoardSearchState {
  /** Current controlled search value. */
  value: string;

  /** Updates the controlled search value. */
  setValue: (value: string) => void;
}

/**
 * Platform-neutral props shared by `FeedbackBoard.Search` implementations.
 *
 * Web and native search props should extend this interface and add only their
 * host input props.
 */
export interface BoardSearchBaseProps {
  /** Controlled search value. */
  value: string;

  /** Called whenever the user changes the search value. */
  onValueChange: (value: string) => void;

  /**
   * Normal children replace the default content. A render-function child
   * replaces the complete visual implementation while retaining controlled
   * search state.
   *
   */
  children?: RenderChildren<BoardSearchState> | undefined;
}
