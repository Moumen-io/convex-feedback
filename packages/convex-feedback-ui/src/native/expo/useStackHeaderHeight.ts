import { createContext, useContext, type Context } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HeaderHeightContext = Context<number | undefined>;

interface ReactNavigationElementsContextRegistry {
  get(name: "HeaderHeightContext"): HeaderHeightContext | undefined;
}

interface GlobalWithReactNavigationElementsContexts {
  __react_navigation__elements_contexts?: ReactNavigationElementsContextRegistry;
}

const fallbackContext = createContext<number | undefined>(undefined);

const defaultHeaderHeight = Platform.select({
  ios: 44,
  android: 56,
  default: 44,
});

/**
 * Returns the full native-stack header height without importing an Expo Router
 * private path. Expo Router 55 and 56+ both register this named context on
 * the shared React Navigation elements registry, although the owning module
 * changed between those releases. When the context is unavailable, the hook
 * falls back to 44 points on iOS or 56 points on Android, plus the top safe
 * area, and never throws.
 */
export function useStackHeaderHeight(): number {
  const insets = useSafeAreaInsets();
  const registry = (
    globalThis as typeof globalThis & GlobalWithReactNavigationElementsContexts
  ).__react_navigation__elements_contexts;
  const context = registry?.get("HeaderHeightContext") ?? fallbackContext;

  const height = useContext(context);

  return height ?? defaultHeaderHeight + insets.top;
}
