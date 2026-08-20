"use client";

import { type CSSProperties } from "react";

import type { FeedbackColorProps, FeedbackTheme } from "../shared/types";

/**
 * CSS custom properties produced for a feedback board.
 */
export interface FeedbackCssVariables extends CSSProperties {
  "--cf-primary"?: string;
  "--cf-background"?: string;
  "--cf-surface"?: string;
  "--cf-surface-muted"?: string;
  "--cf-text"?: string;
  "--cf-muted"?: string;
  "--cf-border"?: string;
  "--cf-danger"?: string;
  "--cf-success"?: string;
  "--cf-radius"?: string;
  "--cf-space"?: string;
}

export function feedbackCssVariables(
  theme: FeedbackTheme,
  colors: FeedbackColorProps,
): FeedbackCssVariables {
  return {
    "--cf-primary": colors.primaryColor ?? theme.colors.primary,
    "--cf-background": colors.backgroundColor ?? theme.colors.background,
    "--cf-surface": colors.surfaceColor ?? theme.colors.surface,
    "--cf-surface-muted": theme.colors.surfaceMuted,
    "--cf-text": colors.textColor ?? theme.colors.text,
    "--cf-muted": colors.mutedColor ?? theme.colors.mutedText,
    "--cf-border": colors.borderColor ?? theme.colors.border,
    "--cf-danger": colors.dangerColor ?? theme.colors.danger,
    "--cf-success": theme.colors.success,
    "--cf-radius": `${theme.radius}px`,
    "--cf-space": `${theme.spacing}px`,
  };
}
