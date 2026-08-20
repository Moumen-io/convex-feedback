import { createContext, useContext, useMemo, type ReactNode } from "react";

import { mergeFeedbackMessages } from "../../shared/messages.js";

import { mergeFeedbackTheme } from "../../shared/theme.js";
import type {
  FeedbackProviderProps,
  FeedbackTheme,
  FeedbackUiContextValue,
} from "../../shared/types/index.js";

const FeedbackNativeContext = createContext<FeedbackUiContextValue | null>(
  null,
);

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
    <FeedbackNativeContext.Provider value={value}>
      {children}
    </FeedbackNativeContext.Provider>
  );
}

export function useFeedbackUi(): FeedbackUiContextValue {
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
  const value = useMemo<FeedbackUiContextValue>(
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
