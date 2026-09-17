import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  RoadmapBoard,
  RoadmapBoardCard,
  useFeedbackUi,
} from "convex-feedback-ui/expo";

import type { ReactNode } from "react";
import { useAdminTheme, type AdminTheme } from "../theme.js";
import { useAdminAction } from "../lib/action.js";
import { feedbackHooks } from "../lib/feedback.js";

const stages: { value: RoadmapStatus }[] = [
  { value: "planned" },
  { value: "in_progress" },
  { value: "shipped" },
];

export interface RoadmapToolbarProps {
  loadingMore: boolean;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onNewItem: () => void;
}

export interface RoadmapScreenProps {
  topInset: number;
  onNewItem: () => void;
  onOpenItem: (item: RoadmapItem) => void;
  renderToolbar?: (props: RoadmapToolbarProps) => ReactNode;
}

export function RoadmapScreen({
  topInset,
  onNewItem,
  onOpenItem,
  renderToolbar,
}: RoadmapScreenProps) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const { messages } = useFeedbackUi();
  const roadmap = feedbackHooks.useRoadmap();
  const items = roadmap.results;
  const move = feedbackHooks.useMoveRoadmapItem();
  const moveAction = useAdminAction();

  return (
    <>
      {renderToolbar?.({
        canLoadMore:
          roadmap.status === "CanLoadMore" || roadmap.status === "LoadingMore",
        loadingMore: roadmap.status === "LoadingMore",
        onLoadMore: () => roadmap.loadMore(feedbackHooks.pageSizes.roadmap),
        onNewItem,
      })}
      <RoadmapBoard
        items={items ?? []}
        stages={stages.map((stage) => ({
          ...stage,
          label: messages.roadmap.statuses[stage.value],
        }))}
        style={{ marginBottom: -20 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        topInset={topInset}
        loading={roadmap.status === "LoadingFirstPage"}
        emptyLabel={messages.roadmap.emptyStage}
        onItemOpen={onOpenItem}
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
                            status: stages[stageIndex - 1]!.value,
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
                            status: stages[stageIndex + 1]!.value,
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
