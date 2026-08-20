import type { FeedbackTheme, FeedbackThemeOverride } from "./types";

export const defaultFeedbackTheme: FeedbackTheme = {
  colors: {
    primary: "#5b5bd6",
    primaryForeground: "#ffffff",
    background: "#ffffff",
    surface: "#ffffff",
    surfaceMuted: "#f6f6f8",
    text: "#17171a",
    mutedText: "#68686f",
    border: "#e2e2e8",
    danger: "#c73535",
    success: "#27834a",
  },
  radius: 12,
  spacing: 12,
};

export function mergeFeedbackTheme(
  override: FeedbackThemeOverride = {},
): FeedbackTheme {
  return {
    colors: { ...defaultFeedbackTheme.colors, ...override.colors },
    radius: override.radius ?? defaultFeedbackTheme.radius,
    spacing: override.spacing ?? defaultFeedbackTheme.spacing,
  };
}
