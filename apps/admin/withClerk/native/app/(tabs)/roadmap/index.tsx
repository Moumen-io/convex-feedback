import type { RoadmapStatus } from "convex-feedback";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
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
      {roadmap.status === "LoadingFirstPage" ? (
        <ActivityIndicator style={styles.loader} color={adminTheme.primary} />
      ) : (
        <ScrollView
          horizontal
          style={styles.boardScroll}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.board,
            {
              paddingLeft: 12 + insets.left,
              paddingRight: 12 + insets.right,
              paddingBottom: 24,
            },
          ]}
        >
          {stages.map((stage, stageIndex) => {
            const stageItems =
              items
                ?.filter((item) => item.status === stage.value)
                .sort((a, b) => a.position - b.position) ?? [];
            return (
              <View key={stage.value} style={styles.column}>
                <View style={styles.columnHeader}>
                  <Text style={styles.columnTitle}>{stage.label}</Text>
                  <Text style={styles.count}>{stageItems.length}</Text>
                </View>
                <FlatList
                  data={stageItems}
                  nestedScrollEnabled
                  contentInsetAdjustmentBehavior="never"
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[
                    styles.cards,
                    { paddingBottom: 16 + insets.bottom },
                  ]}
                  ListEmptyComponent={
                    <Text style={styles.empty}>No items in this stage.</Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.card,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/roadmap/[roadmapId]",
                          params: roadmapRouteParams(item),
                        })
                      }
                    >
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
                    </Pressable>
                  )}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
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
  boardScroll: { flex: 1 },
  loader: { flex: 1 },
  disabled: { opacity: 0.5 },
  board: { gap: 12, paddingTop: 12 },
  column: {
    width: 310,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 16,
    backgroundColor: adminTheme.surface,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: adminTheme.border,
    padding: 14,
  },
  columnTitle: { color: adminTheme.text, fontSize: 14, fontWeight: "700" },
  count: { color: adminTheme.muted, fontSize: 12 },
  cards: { gap: 10, padding: 10 },
  card: {
    gap: 8,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    padding: 13,
  },
  pressed: { opacity: 0.7 },
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
  empty: { color: adminTheme.muted, padding: 18, textAlign: "center" },
});
