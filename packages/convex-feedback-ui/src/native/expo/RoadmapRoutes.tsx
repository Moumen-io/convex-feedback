import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeedbackBody } from "../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../shared/context/FeedbackProvider.js";
import { FeedbackBoard } from "../shared/ui/primitives.js";
import {
  RoadmapBoardContent,
  RoadmapItemContent,
} from "../shared/ui/RoadmapScreen.js";
import {
  roadmapRouteHref,
  roadmapRouteParams,
  parseRoadmapRouteItem,
} from "./routes.js";
import { useRoutedRoadmap } from "./RoutedRoadmapContext.js";

export function RoadmapBoardScreen() {
  const { messages, theme } = useFeedbackUi();
  const { routes, colors, androidToolbarIcons, pageSize } = useRoutedRoadmap();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const searchRef = useRef<SearchBarCommands>(null);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: messages.roadmap.title,
          headerBackVisible: false,
        }}
      />
      <FeedbackBoard.Root {...colors}>
        <RoadmapBoardContent
          pageSize={pageSize}
          query={query}
          onQueryChange={setQuery}
          showHeader={false}
          onItemOpen={(item) => {
            searchRef.current?.blur();
            router.push(
              roadmapRouteHref(routes.item, roadmapRouteParams(item)),
              { relativeToDirectory: true },
            );
          }}
        />
      </FeedbackBoard.Root>

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
    </>
  );
}

export function RoadmapItemScreen() {
  const params = useLocalSearchParams<{
    roadmapId?: string | string[];
    item?: string | string[];
  }>();
  const { hooks } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const { routes, colors, androidToolbarIcons, entryPageSize, onEntryOpen } =
    useRoutedRoadmap();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const roadmapId = Array.isArray(params.roadmapId)
    ? params.roadmapId[0]
    : params.roadmapId;
  const routeItem = parseRoadmapRouteItem(params.item);
  const roadmap = hooks.useRoadmap();
  const item =
    roadmap.results.find((candidate) => candidate.id === roadmapId) ??
    routeItem;

  if (!roadmapId) {
    throw new Error(
      'RoadmapItemScreen requires a "roadmapId" dynamic route parameter.',
    );
  }

  return (
    <>
      {item ? (
        <>
          <Stack.Screen
            options={{ headerTitle: item.title, headerBackVisible: false }}
          />
          <FeedbackBoard.Root {...colors}>
            <FeedbackBoard.List
              style={{
                padding: theme.spacing,
                paddingBottom: insets.bottom + theme.spacing * 2,
                backgroundColor: theme.colors.background,
              }}
            >
              <RoadmapItemContent
                item={item}
                entryPageSize={entryPageSize}
                onEntryOpen={onEntryOpen}
              />
            </FeedbackBoard.List>
          </FeedbackBoard.Root>
        </>
      ) : (
        <FeedbackBoard.Root {...colors}>
          <FeedbackBoard.State>
            {roadmap.status === "LoadingFirstPage" ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              messages.roadmap.noItems
            )}
          </FeedbackBoard.State>
        </FeedbackBoard.Root>
      )}

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={
            process.env.EXPO_OS === "ios"
              ? "chevron.backward"
              : androidToolbarIcons.back
          }
          accessibilityLabel={messages.entry.back}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(roadmapRouteHref(routes.board));
            }
          }}
          tintColor={theme.colors.text}
        >
          {messages.entry.back}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
