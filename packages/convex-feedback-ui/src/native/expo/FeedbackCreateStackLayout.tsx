import {
  Stack,
  useNavigation,
  type NativeStackNavigationOptions,
} from "expo-router";
import { useCallback, useMemo } from "react";

import { useFeedbackBody } from "../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../shared/context/FeedbackProvider.js";
import { RoutedFeedbackModalProvider } from "./RoutedFeedbackModalContext.js";
import { useRoutedFeedback } from "./RoutedFeedbackContext.js";
import type { FeedbackCreateStackLayoutProps } from "./types.js";

export function FeedbackCreateStackLayout({
  screenOptions,
  createOptions,
  entryOptions,
}: FeedbackCreateStackLayoutProps) {
  const parentNavigation = useNavigation();
  const { enabledKinds } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const { routes } = useRoutedFeedback();
  const dismiss = useCallback(
    () => parentNavigation.goBack(),
    [parentNavigation],
  );
  const modal = useMemo(() => ({ dismiss }), [dismiss]);
  const createTitle =
    enabledKinds.length === 1
      ? messages.newFeedback[enabledKinds.at(0)!]
      : messages.board.createEntry;
  const defaults: NativeStackNavigationOptions = {
    headerShown: true,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: theme.colors.background },
  };

  return (
    <RoutedFeedbackModalProvider value={modal}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            ...defaults,
            headerTitle: createTitle,
            ...screenOptions,
            ...createOptions,
          }}
        />
        <Stack.Screen
          name={routes.entry}
          options={{
            ...defaults,
            headerTitle: messages.board.title,
            ...screenOptions,
            ...entryOptions,
          }}
        />
      </Stack>
    </RoutedFeedbackModalProvider>
  );
}
