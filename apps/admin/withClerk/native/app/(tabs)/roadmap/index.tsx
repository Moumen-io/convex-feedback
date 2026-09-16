import type { RoadmapStatus } from "convex-feedback";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  RoadmapBoard,
  RoadmapBoardCard,
  useFeedbackBody,
  useFeedbackUi,
  useStackHeaderHeight,
} from "convex-feedback-ui/expo";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";
import { useAdminAction } from "@/lib/action";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { roadmapRouteParams } from "@/lib/roadmap-route";

const stages: { value: RoadmapStatus }[] = [
  { value: "planned" },
  { value: "in_progress" },
  { value: "shipped" },
];

export default function RoadmapScreen() {
  const router = useRouter();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const headerHeight = useStackHeaderHeight();
  const { hooks } = useFeedbackBody();
  const { messages } = useFeedbackUi();
  const roadmap = hooks.useRoadmap();
  const items = roadmap.results;
  const move = hooks.useMoveRoadmapItem();
  const moveAction = useAdminAction();
  const addIcon = useToolbarIcon("plus", "add");

  return (
    <>
      <Stack.Toolbar placement="right">
        {(roadmap.status === "CanLoadMore" ||
          roadmap.status === "LoadingMore") && (
          <Stack.Toolbar.Button
            disabled={roadmap.status === "LoadingMore"}
            accessibilityLabel="Load more roadmap items"
            onPress={() => roadmap.loadMore(hooks.pageSizes.roadmap)}
            tintColor={theme.text}
          >
            {roadmap.status === "LoadingMore" ? "Loading…" : "More"}
          </Stack.Toolbar.Button>
        )}
        <Stack.Toolbar.Button
          icon={addIcon}
          variant="prominent"
          accessibilityLabel="Add roadmap item"
          onPress={() => router.push("/roadmap/new")}
          tintColor={theme.primary}
        >
          New item
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <RoadmapBoard
        items={items ?? []}
        stages={stages.map((stage) => ({
          ...stage,
          label: messages.roadmap.statuses[stage.value],
        }))}
        style={{ marginBottom: -20 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        topInset={headerHeight}
        loading={roadmap.status === "LoadingFirstPage"}
        emptyLabel={messages.roadmap.emptyStage}
        onItemOpen={(item) =>
          router.push({
            pathname: "/roadmap/[roadmapId]",
            params: roadmapRouteParams(item),
          })
        }
        renderItem={({ item, stageIndex, onOpen }) => (
          <RoadmapBoardCard onPress={onOpen}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {!!item.description && (
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.feedbackCount}>
                {item.feedbackCount} linked
              </Text>
              <View style={styles.actions}>
                {stageIndex > 0 && (
                  <MoveButton
                    label="←"
                    disabled={moveAction.pending}
                    onPress={() =>
                      void moveAction.run(
                        () =>
                          move({
                            roadmapId: item.id,
                            status: stages[stageIndex - 1].value,
                          }),
                        "Could not move roadmap item",
                      )
                    }
                  />
                )}
                {stageIndex < stages.length - 1 && (
                  <MoveButton
                    label="→"
                    disabled={moveAction.pending}
                    onPress={() =>
                      void moveAction.run(
                        () =>
                          move({
                            roadmapId: item.id,
                            status: stages[stageIndex + 1].value,
                          }),
                        "Could not move roadmap item",
                      )
                    }
                  />
                )}
              </View>
            </View>
          </RoadmapBoardCard>
        )}
      />
    </>
  );
}

function MoveButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.moveButton, disabled && styles.disabled]}
    >
      <Text style={styles.moveText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    disabled: { opacity: 0.5 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: "600" },
    cardBody: { color: theme.muted, fontSize: 14, lineHeight: 20 },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    feedbackCount: { color: theme.muted, fontSize: 12 },
    actions: { flexDirection: "row", gap: 6 },
    moveButton: {
      width: 30,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      backgroundColor: theme.primarySoft,
    },
    moveText: { color: theme.primary, fontWeight: "700" },
  });
}
