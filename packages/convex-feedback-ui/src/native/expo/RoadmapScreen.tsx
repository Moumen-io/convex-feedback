import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import type { SearchBarCommands } from "react-native-screens";

import { useFeedbackUi } from "../../shared/context/FeedbackProvider.js";
import type { mergeFeedbackMessages } from "../../shared/messages.js";
import type { mergeFeedbackTheme } from "../../shared/theme.js";
import type { RoadmapScreenProps } from "../../shared/types/index.js";
import {
  RoadmapProvider,
  RoadmapScreen as NativeRoadmapScreen,
  RoadmapScreenContent,
} from "../shared/ui/RoadmapScreen.js";
import type {
  RoadmapAndroidToolbarIcons,
  RoadmapStackScreenOptions,
} from "./types.js";

interface RoadmapScreenWithStack {
  /** Enables the current Expo Router stack integration. @default true */
  useStack?: true;
  /** Options applied to the current Expo Router screen. */
  StackOptions?: RoadmapStackScreenOptions;
  /** Android image source for the toolbar back action. */
  androidToolbarIcons?: RoadmapAndroidToolbarIcons;
}

interface RoadmapScreenWithoutStack {
  useStack: false;
  StackOptions?: never;
  androidToolbarIcons?: never;
}

export type ExpoRoadmapScreenProps = RoadmapScreenProps &
  (RoadmapScreenWithStack | RoadmapScreenWithoutStack);

/**
 * Convenience roadmap screen for a single Expo route. Use
 * `RoadmapStackLayout` when the board and item detail should be separate
 * discovered Expo Router pages.
 */
export function RoadmapScreen(props: ExpoRoadmapScreenProps) {
  if (props.useStack === false) {
    return <NativeRoadmapScreen {...props} />;
  }

  return (
    <RoadmapProvider
      hooks={props.hooks}
      messages={props.messages}
      theme={props.theme}
      unstyled={props.unstyled}
      commentSort={props.commentSort}
      maxCommentDepth={props.maxCommentDepth}
      transformComments={props.transformComments}
      renderActor={props.renderActor}
      onUnauthenticated={props.onUnauthenticated}
    >
      <StackedRoadmapScreen props={props} />
    </RoadmapProvider>
  );
}

function StackedRoadmapScreen({
  props,
}: {
  props: RoadmapScreenWithStack & RoadmapScreenProps;
}) {
  const {
    androidToolbarIcons = {},
    hooks,
    pageSize,
    entryPageSize,
    onEntryOpen,
    onUnauthenticated,
    primaryColor,
    primaryForeground,
    backgroundColor,
    surfaceColor,
    textColor,
    mutedColor,
    borderColor,
    dangerColor,
  } = props;
  const { messages, theme } = useFeedbackUi();
  const [query, setQuery] = useState("");
  const searchRef = useRef<SearchBarCommands>(null);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: messages.roadmap.title,
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: true,
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerTintColor: textColor ?? theme.colors.text,
          contentStyle: {
            backgroundColor: backgroundColor ?? theme.colors.background,
          },
          ...props.StackOptions,
        }}
      />
      <Stack.SearchBar
        ref={searchRef}
        placeholder={messages.roadmap.searchPlaceholder}
        onChangeText={(event) =>
          setQuery(
            (event as unknown as { nativeEvent: { text: string } }).nativeEvent
              .text,
          )
        }
        obscureBackground={false}
        allowToolbarIntegration
        hideNavigationBar={false}
        textColor={theme.colors.text}
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
      <RoadmapToolbar
        androidToolbarIcons={androidToolbarIcons}
        messages={messages}
        theme={theme}
      />
      <RoadmapScreenContent
        pageSize={pageSize ?? hooks.pageSizes.roadmap}
        entryPageSize={entryPageSize ?? hooks.pageSizes.entries}
        query={query}
        onQueryChange={setQuery}
        showBoardHeader={false}
        onEntryOpen={onEntryOpen}
        onUnauthenticated={onUnauthenticated}
        primaryColor={primaryColor}
        primaryForeground={primaryForeground}
        backgroundColor={backgroundColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
        dangerColor={dangerColor}
      />
    </>
  );
}

function RoadmapToolbar({
  androidToolbarIcons,
  messages,
  theme,
}: {
  androidToolbarIcons: RoadmapAndroidToolbarIcons;
  messages: ReturnType<typeof mergeFeedbackMessages>;
  theme: ReturnType<typeof mergeFeedbackTheme>;
}) {
  const router = useRouter();

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        hidden={!router.canGoBack()}
        icon={
          process.env.EXPO_OS === "ios"
            ? "chevron.backward"
            : androidToolbarIcons.back
        }
        accessibilityLabel={messages.entry.back}
        onPress={() => router.back()}
        tintColor={theme.colors.text}
      >
        {messages.entry.back}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
