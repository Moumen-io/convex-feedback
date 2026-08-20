import type { StyleProp } from "react-native";

export function combineStyle<T>(
  enabled: boolean,
  fallback: StyleProp<T>,
  style: StyleProp<T>,
): StyleProp<T> {
  return enabled ? [fallback, style] : style;
}
