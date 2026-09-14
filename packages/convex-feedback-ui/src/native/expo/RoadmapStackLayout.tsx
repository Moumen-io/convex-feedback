import { Stack, type NativeStackNavigationOptions } from "expo-router";

import { Platform } from "react-native";
import { mergeFeedbackMessages } from "../../shared/messages.js";
import { mergeFeedbackTheme } from "../../shared/theme.js";
import { RoadmapProvider } from "../shared/ui/RoadmapScreen.js";
import { RoutedRoadmapProvider } from "./RoutedRoadmapContext.js";
import { resolveRoadmapRoutes } from "./routes.js";
import type { RoadmapStackLayoutProps } from "./types.js";

/**
 * Provider and native-stack layout for real Expo Router roadmap pages.
 * Consumers supply the small route files; this component keeps the roadmap
 * query and entry-detail context mounted while a detail page is pushed.
 * Headers are transparent by default, and the board reserves the measured
 * header height plus the safe area. If a board header is opaque, the native
 * stack already positions content below it and the default top inset is zero.
 * The built-in iOS bottom search toolbar is also included in the default board
 * bottom inset when it is available.
 * `topInset` and `bottomInset` override those defaults, including when set to
 * `0`.
 */
export function RoadmapStackLayout({
  hooks,
  messages,
  theme,
  unstyled,
  onEntryOpen,
  onUnauthenticated,
  commentSort,
  maxCommentDepth,
  transformComments,
  renderActor,
  pageSize = hooks.pageSizes.roadmap,
  entryPageSize = hooks.pageSizes.entries,
  routes: routeOverrides,
  screenOptions,
  boardOptions,
  itemOptions,
  androidToolbarIcons = {},
  topInset,
  bottomInset,
  primaryColor,
  primaryForeground,
  backgroundColor,
  surfaceColor,
  textColor,
  mutedColor,
  borderColor,
  dangerColor,
}: RoadmapStackLayoutProps) {
  const routes = resolveRoadmapRoutes(routeOverrides);
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

  const boardHeaderTransparent =
    boardOptions?.headerTransparent ?? screenOptions?.headerTransparent ?? true;

  const isIos = Platform.OS === "ios";

  const defaults: NativeStackNavigationOptions = {
    headerShown: true,
    headerTransparent: true,
    headerShadowVisible: true,
    headerBackButtonDisplayMode: "minimal",
    headerTintColor: textColor ?? resolvedTheme.colors.text,
    contentStyle: {
      backgroundColor: backgroundColor ?? resolvedTheme.colors.background,
    },
  };

  return (
    <RoadmapProvider
      hooks={hooks}
      messages={messages}
      theme={theme}
      unstyled={unstyled}
      commentSort={commentSort}
      maxCommentDepth={maxCommentDepth}
      transformComments={transformComments}
      renderActor={renderActor}
      onUnauthenticated={onUnauthenticated}
    >
      <RoutedRoadmapProvider
        value={{
          routes,
          colors,
          androidToolbarIcons,
          pageSize,
          entryPageSize,
          onEntryOpen,
          boardHeaderTransparent,
          topInset,
          bottomInset,
        }}
      >
        <Stack>
          <Stack.Screen
            name={routes.board}
            options={{
              ...defaults,
              headerTitle: resolvedMessages.roadmap.title,
              ...screenOptions,
              ...boardOptions,
            }}
          />
          <Stack.Screen
            name={routes.item}
            options={{
              ...defaults,
              presentation: isIos ? "formSheet" : "modal",
              sheetAllowedDetents: "fitToContents",
              headerTitle: resolvedMessages.roadmap.title,
              ...screenOptions,
              ...itemOptions,
            }}
          />
        </Stack>
      </RoutedRoadmapProvider>
    </RoadmapProvider>
  );
}
