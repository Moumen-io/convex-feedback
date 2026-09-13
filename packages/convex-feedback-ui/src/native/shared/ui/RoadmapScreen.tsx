import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import { useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
import { RoadmapBoard, RoadmapBoardCard } from "./RoadmapBoard.js";
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
      <RoadmapScreenContent
        pageSize={pageSize}
        entryPageSize={entryPageSize}
        onEntryOpen={onEntryOpen}
        {...colors}
      />
    </RoadmapProvider>
  );
}

export interface RoadmapScreenContentProps extends Pick<
  RoadmapScreenProps,
  | "onEntryOpen"
  | "onUnauthenticated"
  | "primaryColor"
  | "primaryForeground"
  | "backgroundColor"
  | "surfaceColor"
  | "textColor"
  | "mutedColor"
  | "borderColor"
  | "dangerColor"
> {
  pageSize: number;
  entryPageSize: number;
  /** Controlled search value used by Expo Router's native Stack.SearchBar. */
  query?: string;
  /** Controlled search setter used by Expo Router's native Stack.SearchBar. */
  onQueryChange?: (query: string) => void;
  /** Renders the inline title/search header for non-Stack usage. @default true */
  showBoardHeader?: boolean;
}

/** Shared screen content used by direct native and Expo Stack integrations. */
export function RoadmapScreenContent({
  pageSize,
  entryPageSize,
  onEntryOpen,
  query,
  onQueryChange,
  showBoardHeader = true,
  ...colors
}: RoadmapScreenContentProps) {
  const [selected, setSelected] = useState<RoadmapItem | null>(null);

  return (
    <FeedbackBoard.Root {...colors}>
      {selected === null ? (
        <RoadmapBoardContent
          pageSize={pageSize}
          onItemOpen={setSelected}
          query={query}
          onQueryChange={onQueryChange}
          showHeader={showBoardHeader}
        />
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
  query: controlledQuery,
  onQueryChange,
  showHeader = true,
}: {
  pageSize: number;
  onItemOpen: (item: RoadmapItem) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  showHeader?: boolean;
}) {
  const { hooks } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const insets = useSafeAreaInsets();
  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
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
      {showHeader && (
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
      )}

      {!loading && items.length === 0 ? (
        <FeedbackBoard.State>
          <Text style={[styles.stateText, { color: theme.colors.mutedText }]}>
            {searching
              ? messages.roadmap.noSearchResults
              : messages.roadmap.noItems}
          </Text>
        </FeedbackBoard.State>
      ) : (
        <RoadmapBoard
          items={items}
          stages={stages.map((stage) => ({
            ...stage,
            label: messages.roadmap.statuses[stage.value],
          }))}
          colors={{
            background: theme.colors.background,
            surface: theme.colors.surface,
            text: theme.colors.text,
            muted: theme.colors.mutedText,
            border: theme.colors.border,
            primary: theme.colors.primary,
          }}
          emptyLabel={messages.roadmap.emptyStage}
          loading={loading}
          onItemOpen={onItemOpen}
          renderItem={({ item, onOpen }) => (
            <RoadmapCard item={item} onOpen={onOpen} />
          )}
        />
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
        <RoadmapStatusBadge status={item.status} />
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
              titleNumberOfLines={1}
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

function RoadmapCard({
  item,
  onOpen,
}: {
  item: RoadmapItem;
  onOpen: () => void;
}) {
  const { messages, theme } = useFeedbackUi();

  return (
    <RoadmapBoardCard
      colors={{ border: theme.colors.border, surface: theme.colors.surface }}
      accessibilityLabel={item.title}
      onPress={onOpen}
    >
      <View style={styles.cardMeta}>
        <RoadmapStatusBadge status={item.status} />
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
    </RoadmapBoardCard>
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
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  detailTitle: { fontSize: 26, fontWeight: "800", lineHeight: 31 },
  detailDescription: { fontSize: 15, lineHeight: 23 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  loadingInline: { paddingVertical: 22 },
  emptyText: { lineHeight: 20 },
  entryList: { gap: 10 },
  entryDetail: { gap: 16 },
});
