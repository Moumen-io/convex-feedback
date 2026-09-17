import type { AdminFeedbackEntry } from "convex-feedback";
import { Stack } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdminTheme, type AdminTheme } from "../theme.js";
import { useDebouncedValue } from "../hooks/use-debounced-value.js";
import { feedbackHooks } from "../lib/feedback.js";
import { useToolbarIcon } from "../lib/toolbar-icon.js";

const kinds = ["all", "feedback", "feature_request", "bug_report"] as const;
const statuses = [
  "all",
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
] as const;
const priorities = ["all", "high", "medium", "low"] as const;

interface InboxToolbarProps {
  onSearchChange: (value: string) => void;
  onSearchCancel: () => void;
  kind: (typeof kinds)[number];
  onKindChange: (value: (typeof kinds)[number]) => void;
  status: (typeof statuses)[number];
  onStatusChange: (value: (typeof statuses)[number]) => void;
  priority: (typeof priorities)[number];
  onPriorityChange: (value: (typeof priorities)[number]) => void;
  onNewFeedback: () => void;
}

export interface InboxScreenProps {
  onOpenEntry: (entryId: string) => void;
  onNewFeedback: () => void;
}

export function InboxScreen({ onOpenEntry, onNewFeedback }: InboxScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("all");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("all");
  const debounced = useDebouncedValue(search, 300);
  const filters = useMemo(
    () => ({
      ...(kind === "all" ? {} : { kinds: [kind] }),
      ...(status === "all" ? {} : { status }),
      ...(priority === "all" ? {} : { priority }),
    }),
    [kind, priority, status],
  );
  const listed = feedbackHooks.useAdminEntries(filters);
  const searched = feedbackHooks.useAdminSearchEntries({
    searchQuery: debounced,
    ...filters,
  });
  const page = debounced.trim() ? searched : listed;
  const entries = page.results;

  return (
    <View style={styles.screen}>
      <InboxToolbar
        kind={kind}
        onKindChange={setKind}
        onNewFeedback={onNewFeedback}
        onPriorityChange={setPriority}
        onSearchCancel={() => setSearch("")}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        priority={priority}
        status={status}
      />
      {page.status === "LoadingFirstPage" ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <FlatList
          data={entries}
          contentInsetAdjustmentBehavior="automatic"
          onEndReached={() => {
            if (page.status === "CanLoadMore") {
              page.loadMore(feedbackHooks.pageSizes.entries);
            }
          }}
          onEndReachedThreshold={0.4}
          keyExtractor={(entry) => entry.id}
          style={
            entries.length === 0
              ? [
                  styles.emptyList,
                  {
                    paddingBottom: 24,
                    paddingLeft: 24 + insets.left,
                    paddingRight: 24 + insets.right,
                  },
                ]
              : [
                  styles.list,
                  {
                    paddingLeft: 12 + insets.left,
                    paddingRight: 12 + insets.right,
                  },
                ]
          }
          contentContainerStyle={
            entries.length === 0
              ? styles.emptyList
              : {
                  paddingBottom: 24,
                  borderRadius: 24,
                  overflow: "hidden",
                }
          }
          ListEmptyComponent={
            page.status === "Exhausted" ? (
              <Text style={styles.empty}>
                No feedback matches these filters.
              </Text>
            ) : null
          }
          ListFooterComponent={
            page.status === "LoadingMore" ? (
              <ActivityIndicator
                style={styles.pageLoader}
                color={theme.primary}
              />
            ) : null
          }
          renderItem={({ item, index }) => (
            <EntryRow
              entry={item}
              style={
                index === 0
                  ? styles.topRadius
                  : index === entries.length - 1
                    ? styles.bottomRadius
                    : {}
              }
              onPress={() => onOpenEntry(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

function InboxToolbar(toolbar: InboxToolbarProps) {
  const theme = useAdminTheme();
  const searchRef = useRef<SearchBarCommands>(null);
  const addIcon = useToolbarIcon("plus", "add");
  const filterIcon = useToolbarIcon(
    "line.3.horizontal.decrease",
    "filter_list",
  );

  return (
    <>
      <Stack.SearchBar
        ref={searchRef}
        obscureBackground={false}
        onCancelButtonPress={() => {
          toolbar.onSearchCancel();
          searchRef.current?.clearText();
        }}
        onChangeText={(event) => toolbar.onSearchChange(searchText(event))}
        placement="stacked"
        placeholder="Search feedback"
        textColor={theme.text}
        tintColor={theme.primary}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add feedback"
          icon={addIcon}
          onPress={toolbar.onNewFeedback}
          tintColor={theme.primary}
          variant="prominent"
        >
          New feedback
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          accessibilityLabel="Filters"
          icon={filterIcon}
          tintColor={theme.text}
          title="Filters"
        >
          <Stack.Toolbar.Menu
            accessibilityLabel="Kind"
            tintColor={theme.text}
            title="Kind"
          >
            {["all", "feedback", "feature_request", "bug_report"].map(
              (value) => (
                <Stack.Toolbar.MenuAction
                  isOn={toolbar.kind === value}
                  key={`kind-${value}`}
                  onPress={() =>
                    toolbar.onKindChange(value as InboxToolbarProps["kind"])
                  }
                >
                  {formatFilterValue(value)}
                </Stack.Toolbar.MenuAction>
              ),
            )}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            accessibilityLabel="Status"
            tintColor={theme.text}
            title="Status"
          >
            {[
              "all",
              "open",
              "under_review",
              "planned",
              "in_progress",
              "completed",
              "closed",
            ].map((value) => (
              <Stack.Toolbar.MenuAction
                isOn={toolbar.status === value}
                key={`status-${value}`}
                onPress={() =>
                  toolbar.onStatusChange(value as InboxToolbarProps["status"])
                }
              >
                {formatFilterValue(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            accessibilityLabel="Priority"
            tintColor={theme.text}
            title="Priority"
          >
            {["all", "high", "medium", "low"].map((value) => (
              <Stack.Toolbar.MenuAction
                isOn={toolbar.priority === value}
                key={`priority-${value}`}
                onPress={() =>
                  toolbar.onPriorityChange(
                    value as InboxToolbarProps["priority"],
                  )
                }
              >
                {formatFilterValue(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}

function formatFilterValue(value: string): string {
  return value === "all" ? "All" : value.replaceAll("_", " ");
}

function searchText(event: unknown): string {
  const value = event as { nativeEvent?: { text?: unknown } };
  return typeof value.nativeEvent?.text === "string"
    ? value.nativeEvent.text
    : "";
}

function EntryRow({
  entry,
  onPress,
  style,
}: {
  entry: AdminFeedbackEntry;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed, style]}
    >
      <View style={styles.entryTop}>
        <Text numberOfLines={1} style={styles.entryTitle}>
          {entry.title}
        </Text>
        {entry.priority && (
          <Text style={styles.priority}>{entry.priority}</Text>
        )}
      </View>
      <Text numberOfLines={2} style={styles.body}>
        {entry.body}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{entry.status.replaceAll("_", " ")}</Text>
        <Text style={styles.metaText}>
          {entry.upvoteCount} votes · {entry.commentCount} comments
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    loader: { flex: 1 },
    pageLoader: { paddingVertical: 20 },
    list: { paddingTop: 8 },
    emptyList: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: { color: theme.muted, textAlign: "center" },
    entry: {
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingHorizontal: 14,
      paddingVertical: 15,
    },
    topRadius: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    bottomRadius: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    pressed: { opacity: 0.7 },
    entryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    entryTitle: {
      flex: 1,
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
    },
    priority: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    body: { color: theme.muted, fontSize: 14, lineHeight: 20 },
    meta: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    metaText: {
      color: theme.muted,
      fontSize: 11,
      textTransform: "capitalize",
    },
  });
}
