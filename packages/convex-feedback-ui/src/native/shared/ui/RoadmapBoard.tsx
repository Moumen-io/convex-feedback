import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import type { ReactElement, ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface RoadmapBoardStage {
  value: RoadmapStatus;
  label: string;
}

export interface RoadmapBoardColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
}

export interface RoadmapBoardItemRenderArgs {
  item: RoadmapItem;
  stage: RoadmapBoardStage;
  stageIndex: number;
  onOpen: () => void;
}

export interface RoadmapBoardProps {
  /** Items are grouped into columns using their current status. */
  items: readonly RoadmapItem[];
  /** Ordered columns rendered from left to right. */
  stages: readonly RoadmapBoardStage[];
  /** Colors used by the shared board frame and its loading/empty states. */
  colors: RoadmapBoardColors;
  /** Shows the same full-board loading state as the admin roadmap. */
  loading?: boolean;
  /** Copy shown when a column does not contain any items. */
  emptyLabel: string;
  /** Opens a roadmap item from any rendered card. */
  onItemOpen: (item: RoadmapItem) => void;
  /** Supplies the card UI so admin and user-facing cards can differ. */
  renderItem: (args: RoadmapBoardItemRenderArgs) => ReactElement | null;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export interface RoadmapBoardCardProps extends Pick<
  ViewProps,
  "accessibilityLabel"
> {
  colors: Pick<RoadmapBoardColors, "border" | "surface">;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Shared admin-style pressable card shell with configurable contents. */
export function RoadmapBoardCard({
  colors,
  onPress,
  accessibilityLabel,
  children,
  style,
}: RoadmapBoardCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        style,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Shared stage-board layout used by the public roadmap and admin app.
 *
 * The outer list scrolls horizontally while each stage owns its vertical
 * `FlatList`, matching the admin board's bounded nested-scroll structure.
 */
export function RoadmapBoard({
  items,
  stages,
  colors,
  loading = false,
  emptyLabel,
  onItemOpen,
  renderItem,
  style,
  contentContainerStyle,
}: RoadmapBoardProps) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <ActivityIndicator
        style={[styles.loader, { backgroundColor: colors.background }, style]}
        color={colors.primary}
      />
    );
  }

  return (
    <ScrollView
      horizontal
      style={[
        styles.boardScroll,
        { backgroundColor: colors.background },
        style,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.board,
        {
          paddingLeft: 12 + insets.left,
          paddingRight: 12 + insets.right,
          paddingBottom: 24 + insets.bottom,
        },
        contentContainerStyle,
      ]}
    >
      {stages.map((stage, stageIndex) => {
        const stageItems = items
          .filter((item) => item.status === stage.value)
          .sort((a, b) => a.position - b.position);

        return (
          <View
            key={stage.value}
            style={[
              styles.column,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <View style={[styles.columnHeader, { borderColor: colors.border }]}>
              <Text style={[styles.columnTitle, { color: colors.text }]}>
                {stage.label}
              </Text>
              <Text style={[styles.count, { color: colors.muted }]}>
                {stageItems.length}
              </Text>
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
                <Text style={[styles.empty, { color: colors.muted }]}>
                  {emptyLabel}
                </Text>
              }
              renderItem={({ item }) =>
                renderItem({
                  item,
                  stage,
                  stageIndex,
                  onOpen: () => onItemOpen(item),
                })
              }
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  boardScroll: { flex: 1 },
  loader: { flex: 1 },
  board: { gap: 12, paddingTop: 12 },
  column: {
    width: 310,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    padding: 14,
  },
  columnTitle: { fontSize: 14, fontWeight: "700" },
  count: { fontSize: 12 },
  cards: { gap: 10, padding: 10 },
  empty: { padding: 18, textAlign: "center" },
  card: {
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
  },
  pressed: { opacity: 0.7 },
});
