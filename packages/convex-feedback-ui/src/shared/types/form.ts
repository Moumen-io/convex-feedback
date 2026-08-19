import type { RenderChildren } from "./render.js";

/**
 * State exposed to a custom `FeedbackForm.Submit` renderer.
 */
export interface FormSubmitState {
  /** Whether form submission is currently in progress. */
  submitting: boolean;
}

/**
 * Platform-neutral props shared by `FeedbackForm.Submit` implementations.
 */
export interface FormSubmitBaseProps {
  /**
   * Whether form submission is currently in progress.
   *
   * @default false
   */
  submitting?: boolean | undefined;

  /**
   * Normal children replace the default content. A render-function child
   * replaces the complete control and receives `FormSubmitState`.
   */
  children?: RenderChildren<FormSubmitState> | undefined;
}
