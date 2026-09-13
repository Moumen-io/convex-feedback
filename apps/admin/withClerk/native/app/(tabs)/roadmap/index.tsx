import type { RoadmapStatus } from "convex-feedback";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RoadmapBoard, RoadmapBoardCard } from "convex-feedback-ui/native";

import { adminTheme } from "@/constants/AdminTheme";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { roadmapRouteParams } from "@/lib/roadmap-route";

const stages: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
];

export default function RoadmapScreen() {
  const router = useRouter();
  const roadmap = feedbackHooks.useRoadmap();
  const items = roadmap.results;
  const move = feedbackHooks.useMoveRoadmapItem();
  const moveAction = useAdminAction();
  const addIcon = useToolbarIcon("plus", "add");

  return (
    <View style={styles.screen}>
      <Stack.Toolbar placement="right">
        {(roadmap.status === "CanLoadMore" ||
          roadmap.status === "LoadingMore") && (
          <Stack.Toolbar.Button
            disabled={roadmap.status === "LoadingMore"}
            accessibilityLabel="Load more roadmap items"
            onPress={() => roadmap.loadMore(feedbackHooks.pageSizes.roadmap)}
            tintColor={adminTheme.text}
          >
            {roadmap.status === "LoadingMore" ? "Loading…" : "More"}
          </Stack.Toolbar.Button>
        )}
        <Stack.Toolbar.Button
          icon={addIcon}
          variant="prominent"
          accessibilityLabel="Add roadmap item"
          onPress={() => router.push("/roadmap/new")}
          tintColor={adminTheme.primary}
        >
          New item
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <RoadmapBoard
        items={items ?? []}
        stages={stages}
        colors={adminTheme}
        loading={roadmap.status === "LoadingFirstPage"}
        emptyLabel="No items in this stage."
        onItemOpen={(item) =>
          router.push({
            pathname: "/roadmap/[roadmapId]",
            params: roadmapRouteParams(item),
          })
        }
        renderItem={({ item, stageIndex, onOpen }) => (
          <RoadmapBoardCard colors={adminTheme} onPress={onOpen}>
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
    </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  disabled: { opacity: 0.5 },
  cardTitle: { color: adminTheme.text, fontSize: 15, fontWeight: "600" },
  cardBody: { color: adminTheme.muted, fontSize: 14, lineHeight: 20 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedbackCount: { color: adminTheme.muted, fontSize: 12 },
  actions: { flexDirection: "row", gap: 6 },
  moveButton: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: adminTheme.primarySoft,
  },
  moveText: { color: adminTheme.primary, fontWeight: "700" },
});
