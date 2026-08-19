export interface FeedbackColors {
  primary: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  mutedText: string;
  border: string;
  danger: string;
  success: string;
}

export interface FeedbackTheme {
  colors: FeedbackColors;
  radius: number;
  spacing: number;
}

export interface FeedbackThemeOverride {
  colors?: Partial<FeedbackColors>;
  radius?: number;
  spacing?: number;
}

export const defaultFeedbackTheme: FeedbackTheme = {
  colors: {
    primary: "#5b5bd6",
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
