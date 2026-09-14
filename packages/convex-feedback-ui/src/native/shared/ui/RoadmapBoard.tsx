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
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";

export interface RoadmapBoardStage {
  value: RoadmapStatus;
  label: string;
}

/**
 * @deprecated Configure roadmap colors through `RoadmapProvider`'s `theme`
 * instead. Kept temporarily for backwards compatibility.
 */
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
  /**
   * @deprecated Configure colors through `RoadmapProvider`'s `theme` instead.
   * Kept temporarily for backwards compatibility.
   */
  colors?: RoadmapBoardColors;
  /** Shows the same full-board loading state as the admin roadmap. */
  loading?: boolean;
  /** Copy shown when a column does not contain any items. */
  emptyLabel: string;
  /** Opens a roadmap item from any rendered card. */
  onItemOpen: (item: RoadmapItem) => void;
  /** Supplies the card UI so admin and user-facing cards can differ. */
  renderItem: (args: RoadmapBoardItemRenderArgs) => ReactElement | null;
  /**
   * Additional top space reserved for content behind a transparent native
   * stack header. Defaults to `0`; pass the full header height when the host
   * renders the board under a transparent header.
   */
  topInset?: number;
  /**
   * Total bottom space reserved for a host navigation bar or overlay. Defaults
   * to the bottom safe-area inset. An explicit value replaces that default,
   * including `0`.
   */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export interface RoadmapBoardCardProps extends Pick<
  ViewProps,
  "accessibilityLabel"
> {
  /**
   * @deprecated Configure colors through `RoadmapProvider`'s `theme` instead.
   * Kept temporarily for backwards compatibility.
   */
  colors?: Pick<RoadmapBoardColors, "border" | "surface">;
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
  const { theme } = useFeedbackUi();
  const cardColors = colors ?? {
    border: theme.colors.border,
    surface: theme.colors.surface,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: cardColors.border,
          backgroundColor: cardColors.surface,
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
 * `bottomInset` is treated as total host-occupied space, so a caller that
 * renders an overlay must include both the overlay and any safe-area space.
 */
export function RoadmapBoard({
  items,
  stages,
  colors,
  loading = false,
  emptyLabel,
  onItemOpen,
  renderItem,
  topInset = 0,
  bottomInset,
  style,
  contentContainerStyle,
}: RoadmapBoardProps) {
  const insets = useSafeAreaInsets();
  const resolvedBottomInset = bottomInset ?? insets.bottom;
  const { theme } = useFeedbackUi();
  const resolvedColors = colors
    ? {
        ...theme.colors,
        background: colors.background,
        surface: colors.surface,
        // The legacy palette has no muted surface token. Preserve the old
        // board behavior while callers migrate to RoadmapProvider.theme.
        surfaceMuted: colors.surface,
        text: colors.text,
        mutedText: colors.muted,
        border: colors.border,
        primary: colors.primary,
      }
    : theme.colors;

  if (loading) {
    return (
      <ActivityIndicator
        style={[
          styles.loader,
          { backgroundColor: resolvedColors.background },
          style,
        ]}
        color={resolvedColors.primary}
      />
    );
  }

  return (
    <ScrollView
      horizontal
      style={[
        styles.boardScroll,
        {
          backgroundColor: resolvedColors.background,
        },
        style,
      ]}
      contentInsetAdjustmentBehavior="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.board,
        {
          paddingLeft: 16 + insets.left,
          paddingRight: 16 + insets.right,
          paddingTop: 12 + topInset,
          paddingBottom: 16 + resolvedBottomInset,
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
                borderColor: resolvedColors.border,
                backgroundColor: resolvedColors.surfaceMuted,
              },
            ]}
          >
            <View
              style={[
                styles.columnHeader,
                {
                  borderColor: resolvedColors.border,
                  backgroundColor: resolvedColors.surface,
                },
              ]}
            >
              <Text
                style={[styles.columnTitle, { color: resolvedColors.text }]}
              >
                {stage.label}
              </Text>
              <Text style={[styles.count, { color: resolvedColors.mutedText }]}>
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
                { paddingBottom: 16 + resolvedBottomInset },
              ]}
              ListEmptyComponent={
                <Text
                  style={[styles.empty, { color: resolvedColors.mutedText }]}
                >
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
  board: { gap: 12 },
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
