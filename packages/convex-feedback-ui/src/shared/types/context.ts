import type { ReactNode } from "react";
import type { FeedbackMessageOverrides, FeedbackMessages } from "./messages";
import type { FeedbackTheme, FeedbackThemeOverride } from "./theme";

/**
 * Resolved feedback UI configuration available through `useFeedbackUi`.
 *
 * This contract is shared by the React DOM and React Native implementations.
 */
export interface FeedbackUiContextValue {
  /** Fully resolved and localized UI messages. */
  messages: FeedbackMessages;

  /** Fully resolved visual theme. */
  theme: FeedbackTheme;

  /**
   * Whether package-provided default styling is disabled.
   *
   * Behavioral and structural functionality remains available when enabled.
   */
  unstyled: boolean;
}

/**
 * Props shared by the React DOM and React Native feedback providers.
 */
export interface FeedbackProviderProps {
  /** Feedback UI rendered within the provider. */
  children: ReactNode;

  /**
   * Partial localization or copy overrides.
   *
   * Unspecified values fall back to the built-in English messages.
   */
  messages?: FeedbackMessageOverrides;

  /**
   * Partial visual-theme overrides.
   *
   * Unspecified values fall back to the default feedback theme.
   */
  theme?: FeedbackThemeOverride;

  /**
   * Disables package-provided default styling.
   *
   * @default false
   */
  unstyled?: boolean;
}

/**
 * Convenient semantic color overrides accepted by feedback UI containers.
 *
 * These override equivalent values from the provider theme for the
 * corresponding subtree.
 */
export interface FeedbackColorProps {
  /** Primary interaction and accent color. */
  primaryColor?: string;

  /**
   * Foreground color for primary interactions and accents.
   */
  primaryForeground?: string;

  /** Main background color. */
  backgroundColor?: string;

  /** Card and control surface color. */
  surfaceColor?: string;

  /** Primary text color. */
  textColor?: string;

  /** Secondary and helper text color. */
  mutedColor?: string;

  /** Border and separator color. */
  borderColor?: string;

  /** Destructive and error-state color. */
  dangerColor?: string;
}
