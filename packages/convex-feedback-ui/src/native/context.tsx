import { createContext, useContext, useMemo, type ReactNode } from "react";

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

interface FeedbackNativeContextValue {
  messages: FeedbackMessages;
  theme: FeedbackTheme;
  unstyled: boolean;
}

const FeedbackNativeContext = createContext<FeedbackNativeContextValue | null>(
  null,
);

export interface FeedbackNativeProviderProps {
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
}: FeedbackNativeProviderProps) {
  const value = useMemo<FeedbackNativeContextValue>(
    () => ({
      messages: mergeFeedbackMessages(messages),
      theme: mergeFeedbackTheme(theme),
      unstyled,
    }),
    [messages, theme, unstyled],
  );
  return (
    <FeedbackNativeContext.Provider value={value}>
      {children}
    </FeedbackNativeContext.Provider>
  );
}

export function useFeedbackUi(): FeedbackNativeContextValue {
  const value = useContext(FeedbackNativeContext);
  return (
    value ?? {
      messages: mergeFeedbackMessages(),
      theme: mergeFeedbackTheme(),
      unstyled: false,
    }
  );
}

export interface FeedbackNativeThemeScopeProps {
  children: ReactNode;
  colors: Partial<FeedbackTheme["colors"]>;
}

export function FeedbackNativeThemeScope({
  children,
  colors,
}: FeedbackNativeThemeScopeProps) {
  const parent = useFeedbackUi();
  const value = useMemo<FeedbackNativeContextValue>(
    () => ({
      ...parent,
      theme: {
        ...parent.theme,
        colors: { ...parent.theme.colors, ...colors },
      },
    }),
    [colors, parent],
  );

  return (
    <FeedbackNativeContext.Provider value={value}>
      {children}
    </FeedbackNativeContext.Provider>
  );
}

export interface FeedbackNativeColorProps {
  primaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  surfaceColor?: string | undefined;
  textColor?: string | undefined;
  mutedColor?: string | undefined;
  borderColor?: string | undefined;
  dangerColor?: string | undefined;
}
