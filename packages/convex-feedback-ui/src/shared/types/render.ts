import type { ReactNode } from "react";

/**
 * Children accepted by replaceable feedback UI primitives.
 *
 * Pass normal React children to replace only the primitive's default content,
 * or pass a render function to replace the complete visual implementation
 * while retaining the primitive's typed state and actions.
 *
 * @typeParam State - State and actions exposed to a render-function child.
 */
export type RenderChildren<State> = ReactNode | ((state: State) => ReactNode);
