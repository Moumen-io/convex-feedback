import { Stack, type NativeStackNavigationOptions } from "expo-router";

import { FeedbackBodyProvider } from "../../shared/context/FeedbackBodyProvider.js";
import { FeedbackProvider } from "../../shared/context/FeedbackProvider.js";
import { kinds } from "../../shared/helpers.js";
import { mergeFeedbackMessages } from "../../shared/messages.js";
import { mergeFeedbackTheme } from "../../shared/theme.js";
import { collectExpoMetadata } from "./metadata.js";
import { RoutedFeedbackProvider } from "./RoutedFeedbackContext.js";
import { resolveFeedbackRoutes } from "./routes.js";
import type { FeedbackStackLayoutProps } from "./types.js";

export function FeedbackStackLayout({
  hooks,
  messages,
  theme,
  unstyled,
  entrySort = "top",
  commentSort = "top",
  enabledKinds = kinds,
  maxCommentDepth = 5,
  debounceDuration = 300,
  collectMetadata,
  transformComments,
  renderActor,
  routes: routeOverrides,
  screenOptions,
  boardOptions,
  entryOptions,
  createOptions,
  primaryColor,
  primaryForeground,
  backgroundColor,
  surfaceColor,
  textColor,
  mutedColor,
  borderColor,
  dangerColor,
}: FeedbackStackLayoutProps) {
  const routes = resolveFeedbackRoutes(routeOverrides);
  const resolvedMessages = mergeFeedbackMessages(messages);
  const resolvedTheme = mergeFeedbackTheme(theme);
  const colors = {
    primaryColor,
    primaryForeground,
    backgroundColor,
    surfaceColor,
    textColor,
    mutedColor,
    borderColor,
    dangerColor,
  };
  const background = backgroundColor ?? resolvedTheme.colors.background;
  const boardTitle =
    enabledKinds.length === 1
      ? resolvedMessages.kindsPlural[enabledKinds.at(0)!]
      : resolvedMessages.board.title;
  const defaults: NativeStackNavigationOptions = {
    headerShown: true,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: background },
  };

  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <FeedbackBodyProvider
        hooks={hooks}
        entrySort={entrySort}
        commentSort={commentSort}
        enabledKinds={enabledKinds}
        maxCommentDepth={maxCommentDepth}
        debounceDuration={debounceDuration}
        collectMetadata={collectMetadata}
        collectStandardMetadata={collectExpoMetadata}
        transformComments={transformComments}
        renderActor={renderActor}
      >
        <RoutedFeedbackProvider value={{ routes, colors }}>
          <Stack>
            <Stack.Screen
              name={routes.board}
              options={{
                ...defaults,
                headerTitle: boardTitle,
                headerTransparent: true,
                headerShadowVisible: true,
                ...screenOptions,
                ...boardOptions,
              }}
            />
            <Stack.Screen
              name={routes.entry}
              options={{
                ...defaults,
                headerTitle: boardTitle,
                ...screenOptions,
                ...entryOptions,
              }}
            />
            <Stack.Screen
              name={routes.create}
              options={{
                ...defaults,
                headerShown: false,
                presentation: "modal",
                ...screenOptions,
                ...createOptions,
              }}
            />
          </Stack>
        </RoutedFeedbackProvider>
      </FeedbackBodyProvider>
    </FeedbackProvider>
  );
}
