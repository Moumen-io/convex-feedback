/**
 * Semantic colors used by the feedback UI on both React DOM and React Native.
 */
export interface FeedbackColors {
  /** Primary interaction and accent color. */
  primary: string;

  /**
   * Foreground color for primary interactions and accents.
   */
  primaryForeground: string;

  /** Main screen or board background color. */
  background: string;

  /** Default card and control surface color. */
  surface: string;

  /** Secondary or muted surface color. */
  surfaceMuted: string;

  /** Primary text color. */
  text: string;

  /** Secondary, metadata, and helper text color. */
  mutedText: string;

  /** Border and separator color. */
  border: string;

  /** Destructive and error-state color. */
  danger: string;

  /** Positive and success-state color. */
  success: string;
}

/**
 * Fully resolved visual theme consumed by feedback UI primitives.
 */
export interface FeedbackTheme {
  /** Semantic feedback color palette. */
  colors: FeedbackColors;

  /** Base corner radius in logical pixels. */
  radius: number;

  /** Base spacing unit in logical pixels. */
  spacing: number;
}

/**
 * Partial theme accepted by feedback providers and prebuilt screens.
 *
 * Missing values fall back to the package's default feedback theme.
 */
export interface FeedbackThemeOverride {
  /** Partial semantic color overrides. */
  colors?: Partial<FeedbackColors> | undefined;

  /** Base corner-radius override. */
  radius?: number | undefined;

  /** Base spacing-unit override. */
  spacing?: number | undefined;
}
