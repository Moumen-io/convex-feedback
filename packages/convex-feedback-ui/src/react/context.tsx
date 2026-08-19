"use client";

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  mergeFeedbackMessages,
  type FeedbackMessageOverrides,
  type FeedbackMessages,
} from "../shared/messages.js";
import {
  mergeFeedbackTheme,
  type FeedbackTheme,
  type FeedbackThemeOverride,
} from "../shared/theme.js";

interface FeedbackUiContextValue {
  messages: FeedbackMessages;
  theme: FeedbackTheme;
  unstyled: boolean;
}

const FeedbackUiContext = createContext<FeedbackUiContextValue | null>(null);

export interface FeedbackProviderProps {
  children: ReactNode;
  messages?: FeedbackMessageOverrides | undefined;
  theme?: FeedbackThemeOverride | undefined;
  unstyled?: boolean | undefined;
}

export function FeedbackProvider({
  children,
  messages,
  theme,
  unstyled = false,
}: FeedbackProviderProps) {
  const value = useMemo<FeedbackUiContextValue>(
    () => ({
      messages: mergeFeedbackMessages(messages),
      theme: mergeFeedbackTheme(theme),
      unstyled,
    }),
    [messages, theme, unstyled],
  );
  return (
    <FeedbackUiContext.Provider value={value}>
      {children}
    </FeedbackUiContext.Provider>
  );
}

export function useFeedbackUi(): FeedbackUiContextValue {
  const context = useContext(FeedbackUiContext);
  if (context === null) {
    return {
      messages: mergeFeedbackMessages(),
      theme: mergeFeedbackTheme(),
      unstyled: false,
    };
  }
  return context;
}

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

export interface FeedbackColorProps {
  primaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  surfaceColor?: string | undefined;
  textColor?: string | undefined;
  mutedColor?: string | undefined;
  borderColor?: string | undefined;
  dangerColor?: string | undefined;
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
