import { createContext, useContext } from "react";

import type { RoutedRoadmapContextValue } from "./types.js";

const RoutedRoadmapContext = createContext<RoutedRoadmapContextValue | null>(
  null,
);

export const RoutedRoadmapProvider = RoutedRoadmapContext.Provider;

export function useRoutedRoadmap(): RoutedRoadmapContextValue {
  const value = useContext(RoutedRoadmapContext);

  if (value === null) {
    throw new Error(
      "Routed roadmap screens must be rendered inside RoadmapStackLayout.",
    );
  }

  return value;
}
