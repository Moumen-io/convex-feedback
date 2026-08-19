import type { ReactNode } from "react";

export type RenderChildren<State> = ReactNode | ((state: State) => ReactNode);

export function renderChildren<State>(
  children: RenderChildren<State> | undefined,
  state: State,
  fallback: ReactNode,
): ReactNode {
  return typeof children === "function"
    ? children(state)
    : (children ?? fallback);
}
