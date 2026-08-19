import type { ReactNode } from "react";
import type { RenderChildren } from "./types";

export function renderChildren<State>(
  children: RenderChildren<State> | undefined,
  state: State,
  fallback: ReactNode,
): ReactNode {
  return typeof children === "function"
    ? children(state)
    : (children ?? fallback);
}
