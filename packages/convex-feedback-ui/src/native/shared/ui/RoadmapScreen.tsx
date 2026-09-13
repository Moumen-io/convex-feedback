import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import { useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FeedbackBodyProvider,
  useFeedbackBody,
} from "../../../shared/context/FeedbackBodyProvider.js";
import {
  FeedbackProvider,
  useFeedbackUi,
} from "../../../shared/context/FeedbackProvider.js";
import { kinds } from "../../../shared/helpers.js";
import type { RoadmapScreenProps } from "../../../shared/types/index.js";
import { collectNativeMetadata } from "../metadata.js";
import { Button } from "./Button.js";
import { EntryCard } from "./EntryCard.js";
import { EntryDetail } from "./EntryDetail.js";
import { FeedbackBoard } from "./primitives.js";

const stages: readonly { value: RoadmapStatus }[] = [
  { value: "planned" },
  { value: "in_progress" },
  { value: "shipped" },
];

/**
 * Keeps the roadmap and its attached entry details on the same UI context.
 * Routed Expo layouts reuse this provider so every route sees the same hooks,
 * theme, messages, and comment configuration.
 */
export function RoadmapProvider({
  hooks,
  messages,
  theme,
  unstyled,
  commentSort = "top",
  maxCommentDepth = 5,
  transformComments,
  renderActor,
  onUnauthenticated,
  children,
}: PropsWithChildren<
  Pick<
    RoadmapScreenProps,
    | "hooks"
    | "messages"
    | "theme"
    | "unstyled"
    | "commentSort"
    | "maxCommentDepth"
    | "transformComments"
    | "renderActor"
    | "onUnauthenticated"
  >
>) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <FeedbackBodyProvider
        hooks={hooks}
        entrySort="top"
        commentSort={commentSort}
        enabledKinds={kinds}
        maxCommentDepth={maxCommentDepth}
        debounceDuration={300}
        collectStandardMetadata={collectNativeMetadata}
        transformComments={transformComments}
        renderActor={renderActor}
        onUnauthenticated={onUnauthenticated}
      >
        {children}
      </FeedbackBodyProvider>
    </FeedbackProvider>
  );
}

/** Self-contained public roadmap screen for native and non-routed Expo apps. */
export function RoadmapScreen({
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
  ...colors
}: RoadmapScreenProps) {
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
      <RoadmapScreenInner
        pageSize={pageSize}
        entryPageSize={entryPageSize}
        onEntryOpen={onEntryOpen}
        {...colors}
      />
    </RoadmapProvider>
  );
}

function RoadmapScreenInner({
  pageSize,
  entryPageSize,
  onEntryOpen,
  ...colors
}: Omit<RoadmapScreenProps, "hooks" | "pageSize" | "entryPageSize"> & {
  pageSize: number;
  entryPageSize: number;
}) {
  const [selected, setSelected] = useState<RoadmapItem | null>(null);

  return (
    <FeedbackBoard.Root {...colors}>
      {selected === null ? (
        <RoadmapBoardContent pageSize={pageSize} onItemOpen={setSelected} />
      ) : (
        <RoadmapDetailPage
          item={selected}
          entryPageSize={entryPageSize}
          onEntryOpen={onEntryOpen}
          onBack={() => setSelected(null)}
        />
      )}
    </FeedbackBoard.Root>
  );
}

/** Board content used by both the self-contained and routed Expo screens. */
export function RoadmapBoardContent({
  pageSize,
  onItemOpen,
}: {
  pageSize: number;
  onItemOpen: (item: RoadmapItem) => void;
}) {
  const { hooks } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const roadmap = hooks.useRoadmap();
  const search = hooks.useSearchRoadmap(query);
  const searching = query.trim().length > 0;
  const items = searching ? (search ?? []) : roadmap.results;
  const loading = searching
    ? search === undefined
    : roadmap.status === "LoadingFirstPage";

  return (
    <View
      style={[styles.boardScreen, { backgroundColor: theme.colors.background }]}
    >
      <FeedbackBoard.Header
        style={[
          styles.boardHeader,
          { paddingTop: Math.max(theme.spacing, insets.top + 12) },
        ]}
      >
        <FeedbackBoard.Title>{messages.roadmap.title}</FeedbackBoard.Title>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>
          {messages.roadmap.subtitle}
        </Text>
        <FeedbackBoard.Search
          value={query}
          onValueChange={setQuery}
          placeholder={messages.roadmap.searchPlaceholder}
          accessibilityLabel={messages.roadmap.searchPlaceholder}
        />
      </FeedbackBoard.Header>

      {loading ? (
        <RoadmapLoadingBoard />
      ) : items.length === 0 ? (
        <FeedbackBoard.State>
          <Text style={[styles.stateText, { color: theme.colors.mutedText }]}>
            {searching
              ? messages.roadmap.noSearchResults
              : messages.roadmap.noItems}
          </Text>
        </FeedbackBoard.State>
      ) : (
        <RoadmapColumns items={items} onItemOpen={onItemOpen} />
      )}

      {!searching &&
        (roadmap.status === "CanLoadMore" ||
          roadmap.status === "LoadingMore") && (
          <View
            style={{
              alignItems: "center",
              paddingBottom: insets.bottom + theme.spacing,
            }}
          >
            <Button
              label={messages.board.loadMore}
              disabled={roadmap.status === "LoadingMore"}
              onPress={() => roadmap.loadMore(pageSize)}
            />
          </View>
        )}
    </View>
  );
}

/** Detail content used by routed roadmap item pages and in-screen navigation. */
export function RoadmapItemContent({
  item,
  entryPageSize,
  onEntryOpen,
}: {
  item: RoadmapItem;
  entryPageSize: number;
  onEntryOpen?: (entryId: string) => void;
}) {
  const { hooks } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const feedback = hooks.useRoadmapFeedback(item.id);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  if (selectedEntryId !== null) {
    return (
      <View style={styles.entryDetail}>
        <Button
          label={messages.entry.back}
          onPress={() => setSelectedEntryId(null)}
        />
        <EntryDetail
          entryId={selectedEntryId}
          hideBackButton
          onBack={() => setSelectedEntryId(null)}
        />
      </View>
    );
  }

  const openEntry = (entryId: string) => {
    if (onEntryOpen === undefined) {
      setSelectedEntryId(entryId);
    } else {
      onEntryOpen(entryId);
    }
  };

  return (
    <View style={styles.detailContent}>
      <View style={styles.detailIntro}>
        <View style={styles.detailMetaRow}>
          <RoadmapStatusBadge status={item.status} />
          <Text style={[styles.detailCount, { color: theme.colors.mutedText }]}>
            {messages.roadmap.linkedEntries(item.feedbackCount)}
          </Text>
        </View>
        <Text style={[styles.detailTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        {item.description ? (
          <Text
            style={[
              styles.detailDescription,
              { color: theme.colors.mutedText },
            ]}
          >
            {item.description}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {messages.roadmap.attachedFeedback}
      </Text>

      {feedback.status === "LoadingFirstPage" ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : feedback.results.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.mutedText }]}>
          {messages.roadmap.noAttachedFeedback}
        </Text>
      ) : (
        <View style={styles.entryList}>
          {feedback.results.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              hooks={hooks}
              onOpen={() => openEntry(entry.id)}
            />
          ))}
        </View>
      )}

      {(feedback.status === "CanLoadMore" ||
        feedback.status === "LoadingMore") && (
        <Button
          label={messages.board.loadMore}
          disabled={feedback.status === "LoadingMore"}
          onPress={() => feedback.loadMore(entryPageSize)}
        />
      )}
    </View>
  );
}

function RoadmapDetailPage({
  item,
  entryPageSize,
  onEntryOpen,
  onBack,
}: {
  item: RoadmapItem;
  entryPageSize: number;
  onEntryOpen?: (entryId: string) => void;
  onBack: () => void;
}) {
  const { theme, messages } = useFeedbackUi();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.detailScreen,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[
          styles.detailToolbar,
          { paddingTop: Math.max(theme.spacing, insets.top + 8) },
        ]}
      >
        <Button label={messages.entry.back} onPress={onBack} />
      </View>
      <FeedbackBoard.List
        style={{
          paddingHorizontal: theme.spacing,
          paddingBottom: insets.bottom + theme.spacing * 2,
        }}
      >
        <RoadmapItemContent
          item={item}
          entryPageSize={entryPageSize}
          onEntryOpen={onEntryOpen}
        />
      </FeedbackBoard.List>
    </View>
  );
}

function RoadmapColumns({
  items,
  onItemOpen,
}: {
  items: readonly RoadmapItem[];
  onItemOpen: (item: RoadmapItem) => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      horizontal
      style={styles.columnsScroll}
      contentInsetAdjustmentBehavior="automatic"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.columnsContent,
        {
          paddingLeft: theme.spacing + insets.left,
          paddingRight: theme.spacing + insets.right,
          paddingBottom: insets.bottom + theme.spacing * 2,
        },
      ]}
    >
      {stages.map((stage) => {
        const stageItems = items
          .filter((item) => item.status === stage.value)
          .sort((a, b) => a.position - b.position);

        return (
          <View
            key={stage.value}
            style={[
              styles.column,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceMuted,
              },
            ]}
          >
            <View
              style={[
                styles.columnHeader,
                { borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.columnHeading}>
                <RoadmapStatusBadge status={stage.value} />
                <Text
                  style={[styles.columnTitle, { color: theme.colors.text }]}
                >
                  {messages.roadmap.statuses[stage.value]}
                </Text>
              </View>
              <Text
                style={[styles.columnCount, { color: theme.colors.mutedText }]}
              >
                {stageItems.length}
              </Text>
            </View>
            <ScrollView
              style={styles.columnList}
              nestedScrollEnabled
              contentInsetAdjustmentBehavior="never"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnItems}
            >
              {stageItems.length === 0 ? (
                <Text
                  style={[
                    styles.emptyColumn,
                    { color: theme.colors.mutedText },
                  ]}
                >
                  {messages.roadmap.noItems}
                </Text>
              ) : (
                stageItems.map((item) => (
                  <RoadmapCard
                    key={item.id}
                    item={item}
                    onOpen={() => onItemOpen(item)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

function RoadmapLoadingBoard() {
  const { messages, theme } = useFeedbackUi();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      horizontal
      style={styles.columnsScroll}
      contentInsetAdjustmentBehavior="automatic"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.columnsContent,
        {
          paddingLeft: theme.spacing + insets.left,
          paddingRight: theme.spacing + insets.right,
          paddingBottom: insets.bottom + theme.spacing * 2,
        },
      ]}
    >
      {stages.map((stage) => (
        <View
          key={stage.value}
          style={[
            styles.column,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceMuted,
            },
          ]}
        >
          <View
            style={[styles.columnHeader, { borderColor: theme.colors.border }]}
          >
            <Text style={[styles.columnTitle, { color: theme.colors.text }]}>
              {messages.roadmap.statuses[stage.value]}
            </Text>
          </View>
          <View style={styles.loadingColumn}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function RoadmapCard({
  item,
  onOpen,
}: {
  item: RoadmapItem;
  onOpen: () => void;
}) {
  const { messages, theme } = useFeedbackUi();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardMeta}>
        <RoadmapStatusBadge status={item.status} />
        <Text style={[styles.cardCount, { color: theme.colors.mutedText }]}>
          {messages.roadmap.linkedEntries(item.feedbackCount)}
        </Text>
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        {item.title}
      </Text>
      {item.description ? (
        <Text
          style={[styles.cardDescription, { color: theme.colors.mutedText }]}
          numberOfLines={3}
        >
          {item.description}
        </Text>
      ) : null}
      <Text style={[styles.cardLink, { color: theme.colors.primary }]}>
        {messages.entry.open} ›
      </Text>
    </Pressable>
  );
}

function RoadmapStatusBadge({ status }: { status: RoadmapStatus }) {
  const { messages, theme } = useFeedbackUi();

  return (
    <View
      style={[
        styles.statusBadge,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceMuted,
        },
      ]}
    >
      <View
        style={[styles.statusDot, { backgroundColor: theme.colors.primary }]}
      />
      <Text style={[styles.statusText, { color: theme.colors.mutedText }]}>
        {messages.roadmap.statuses[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  boardScreen: { flex: 1, minHeight: 0 },
  boardHeader: {
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  subtitle: { fontSize: 14, lineHeight: 20 },
  stateText: { textAlign: "center" },
  columnsScroll: { flex: 1 },
  columnsContent: { gap: 12, alignItems: "stretch", paddingTop: 4 },
  column: {
    width: 306,
    minHeight: 400,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  columnHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  columnHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  columnTitle: { fontSize: 14, fontWeight: "700" },
  columnCount: { fontSize: 12, fontWeight: "700" },
  columnItems: { gap: 10, padding: 10 },
  columnList: { flex: 1 },
  emptyColumn: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 26,
    textAlign: "center",
  },
  loadingColumn: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  pressed: { opacity: 0.7 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardCount: { fontSize: 11, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  cardDescription: { fontSize: 13, lineHeight: 19 },
  cardLink: { fontSize: 13, fontWeight: "700" },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  detailScreen: { flex: 1, minHeight: 0 },
  detailToolbar: { paddingHorizontal: 18, paddingBottom: 10 },
  detailContent: { gap: 18 },
  detailIntro: { gap: 10 },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  detailCount: { fontSize: 12, fontWeight: "600" },
  detailTitle: { fontSize: 26, fontWeight: "800", lineHeight: 31 },
  detailDescription: { fontSize: 15, lineHeight: 23 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  loadingInline: { paddingVertical: 22 },
  emptyText: { lineHeight: 20 },
  entryList: { gap: 10 },
  entryDetail: { gap: 16 },
});
