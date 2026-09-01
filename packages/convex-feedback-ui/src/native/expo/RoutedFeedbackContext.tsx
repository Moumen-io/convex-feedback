import { createContext, useContext } from "react";
import type { RoutedFeedbackContextValue } from "./types.js";

const RoutedFeedbackContext = createContext<RoutedFeedbackContextValue | null>(
  null,
);

export const RoutedFeedbackProvider = RoutedFeedbackContext.Provider;

export function useRoutedFeedback(): RoutedFeedbackContextValue {
  const value = useContext(RoutedFeedbackContext);

  if (value === null) {
    throw new Error(
      "Routed feedback screens must be rendered inside FeedbackStackLayout.",
    );
  }

  return value;
}
