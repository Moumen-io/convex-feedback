import { createContext, useContext } from "react";

interface RoutedFeedbackModalContextValue {
  dismiss: () => void;
}

const RoutedFeedbackModalContext =
  createContext<RoutedFeedbackModalContextValue | null>(null);

export const RoutedFeedbackModalProvider = RoutedFeedbackModalContext.Provider;

export function useRoutedFeedbackModal() {
  return useContext(RoutedFeedbackModalContext);
}
