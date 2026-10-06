import { Button, Host, List, Section, Text, VStack } from "@expo/ui/swift-ui";
import {
  disabled,
  environment,
  font,
  foregroundStyle,
  lineLimit,
} from "@expo/ui/swift-ui/modifiers";
import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import {
  useAdminFeedbackHooks,
  useAdminTheme,
  useAdminThemeSettings,
} from "convex-feedback-admin-app-screens/native";
import { goBackOrReplace, useFeedbackUi } from "convex-feedback-ui/expo";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, View, useColorScheme } from "react-native";

const stages: RoadmapStatus[] = ["planned", "in_progress", "shipped"];

type RoadmapMoveArgs = {
  roadmapId: string;
  status: RoadmapStatus;
  previousItemId?: string;
  nextItemId?: string;
};

export default function ReorderRoadmapRoute() {
  const router = useRouter();
  const feedbackHooks = useAdminFeedbackHooks();
  const theme = useAdminTheme();
  const themeSettings = useAdminThemeSettings();
  const systemColorScheme = useColorScheme();
  const { messages } = useFeedbackUi();
  const moveRoadmapItem = feedbackHooks.useMoveRoadmapItem();
  const mutationInProgress = useRef(false);
  const [saving, setSaving] = useState(false);

  const persistMove = useCallback(
    async (args: RoadmapMoveArgs) => {
      if (mutationInProgress.current) return;

      mutationInProgress.current = true;
      setSaving(true);
      try {
        const result = await moveRoadmapItem(args);
        if (typeof result !== "number") {
          throw new Error(
            "This request was rate limited. Please try again later.",
          );
        }
      } finally {
        mutationInProgress.current = false;
        setSaving(false);
      }
    },
    [moveRoadmapItem],
  );

  const colorScheme =
    themeSettings?.themeMode === "light" || themeSettings?.themeMode === "dark"
      ? themeSettings.themeMode
      : systemColorScheme === "light" || systemColorScheme === "dark"
        ? systemColorScheme
        : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Done reordering roadmap items"
          onPress={() => goBackOrReplace(router, "/roadmap")}
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Host
        colorScheme={colorScheme}
        seedColor={theme.primary}
        style={{ flex: 1 }}
      >
        <List modifiers={[environment("editMode", "active")]}>
          {stages.map((status) => (
            <RoadmapStageSection
              key={status}
              busyRef={mutationInProgress}
              isSaving={saving}
              onMove={persistMove}
              status={status}
              title={messages.roadmap.statuses[status]}
            />
          ))}
        </List>
      </Host>
    </View>
  );
}

function RoadmapStageSection({
  busyRef,
  isSaving,
  onMove,
  status,
  title,
}: {
  busyRef: { current: boolean };
  isSaving: boolean;
  onMove: (args: RoadmapMoveArgs) => Promise<void>;
  status: RoadmapStatus;
  title: string;
}) {
  const feedbackHooks = useAdminFeedbackHooks();
  const { messages } = useFeedbackUi();
  const theme = useAdminTheme();
  const roadmap = feedbackHooks.useRoadmap(status, { includeLookahead: true });
  const hasMoreItems =
    roadmap.status === "CanLoadMore" || roadmap.status === "LoadingMore";
  const roadmapItems = roadmap.results ?? [];
  const lookaheadItem = hasMoreItems ? roadmapItems.at(-1) : undefined;
  // Keep the extra row hidden so it can anchor moves at the loaded-page end.
  const visibleItems =
    hasMoreItems && lookaheadItem ? roadmapItems.slice(0, -1) : roadmapItems;
  const [items, setItems] = useState<RoadmapItem[]>(() => [...visibleItems]);
  const itemsRef = useRef(items);
  const loadingMore = roadmap.status === "LoadingMore";
  const canLoadMore = hasMoreItems;

  useEffect(() => {
    const nextItems = [...(roadmap.results ?? [])];
    if (hasMoreItems && nextItems.length > 0) nextItems.pop();
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, [roadmap.results, hasMoreItems]);

  const handleMove = useCallback(
    (sourceIndices: number[], destination: number) => {
      if (busyRef.current || sourceIndices.length !== 1) return;

      const sourceIndex = sourceIndices[0];
      if (sourceIndex === undefined || sourceIndex < 0) return;

      const currentItems = itemsRef.current;
      const movedItem = currentItems[sourceIndex];
      if (!movedItem) return;

      const remainingItems = currentItems.filter(
        (_, index) => index !== sourceIndex,
      );
      const destinationIndex = Math.max(
        0,
        Math.min(
          remainingItems.length,
          destination > sourceIndex ? destination - 1 : destination,
        ),
      );
      if (
        hasMoreItems &&
        destinationIndex === remainingItems.length &&
        !lookaheadItem
      ) {
        return;
      }
      const nextItems = [...remainingItems];
      nextItems.splice(destinationIndex, 0, movedItem);
      if (
        nextItems.every((item, index) => item.id === currentItems[index]?.id)
      ) {
        return;
      }

      itemsRef.current = nextItems;
      setItems(nextItems);

      const previousItem = nextItems[destinationIndex - 1];
      const nextItem = nextItems[destinationIndex + 1] ?? lookaheadItem;

      void onMove({
        roadmapId: movedItem.id,
        status,
        ...(previousItem ? { previousItemId: previousItem.id } : {}),
        ...(nextItem ? { nextItemId: nextItem.id } : {}),
      }).catch((error: unknown) => {
        itemsRef.current = currentItems;
        setItems(currentItems);
        Alert.alert(
          "Could not reorder roadmap item",
          error instanceof Error ? error.message : "Please try again.",
        );
      });
    },
    [busyRef, hasMoreItems, lookaheadItem, onMove, status],
  );

  return (
    <Section
      title={title}
      footer={
        canLoadMore ? (
          <Button
            label={
              loadingMore ? "Loading…" : `Load more ${title.toLowerCase()}`
            }
            onPress={
              !loadingMore && !isSaving
                ? () => roadmap.loadMore(feedbackHooks.pageSizes.roadmap)
                : undefined
            }
            modifiers={[disabled(loadingMore || isSaving)]}
          />
        ) : undefined
      }
    >
      {items.length > 0 ? (
        <List.ForEach onMove={handleMove}>
          {items.map((item) => (
            <VStack key={item.id} alignment="leading" spacing={4}>
              <Text
                modifiers={[
                  font({ textStyle: "headline" }),
                  foregroundStyle(theme.text),
                ]}
              >
                {item.title}
              </Text>
              {item.description ? (
                <Text
                  modifiers={[
                    font({ textStyle: "subheadline" }),
                    foregroundStyle(theme.muted),
                    lineLimit(2),
                  ]}
                >
                  {item.description}
                </Text>
              ) : null}
              <Text
                modifiers={[
                  font({ textStyle: "caption" }),
                  foregroundStyle(theme.muted),
                ]}
              >
                {`${item.feedbackCount} linked feedback ${item.feedbackCount === 1 ? "item" : "items"}`}
              </Text>
            </VStack>
          ))}
        </List.ForEach>
      ) : (
        <Text modifiers={[foregroundStyle(theme.muted)]}>
          {roadmap.status === "LoadingFirstPage"
            ? "Loading roadmap items…"
            : messages.roadmap.emptyStage}
        </Text>
      )}
    </Section>
  );
}
