import type { AdminFeedbackEntry } from "convex-feedback";
import { Stack, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SearchBarCommands } from "react-native-screens";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { feedbackHooks } from "@/lib/feedback";
import { useToolbarIcon } from "@/lib/native-toolbar";

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

function formatFilterValue(value: string): string {
  return value === "all" ? "All" : value.replaceAll("_", " ");
}

function searchText(event: unknown): string {
  const value = event as { nativeEvent?: { text?: unknown } };
  return typeof value.nativeEvent?.text === "string"
    ? value.nativeEvent.text
    : "";
}

export default function InboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const searchRef = useRef<SearchBarCommands>(null);
  const addIcon = useToolbarIcon("plus", "add");
  const filterIcon = useToolbarIcon(
    "line.3.horizontal.decrease",
    "filter_list",
  );
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
      <Stack.SearchBar
        ref={searchRef}
        placement="stacked"
        placeholder="Search feedback"
        onChangeText={(event) => setSearch(searchText(event))}
        onCancelButtonPress={() => {
          setSearch("");
          searchRef.current?.clearText();
        }}
        obscureBackground={false}
        textColor={theme.text}
        tintColor={theme.primary}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={addIcon}
          variant="prominent"
          accessibilityLabel="Add feedback"
          onPress={() => router.push("/feedback/new")}
          tintColor={theme.primary}
        >
          New feedback
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          icon={filterIcon}
          title="Filters"
          accessibilityLabel="Filters"
          tintColor={theme.text}
        >
          <Stack.Toolbar.Menu
            title="Kind"
            accessibilityLabel="Kind"
            tintColor={theme.text}
          >
            {kinds.map((value) => (
              <Stack.Toolbar.MenuAction
                key={`kind-${value}`}
                isOn={kind === value}
                onPress={() => setKind(value)}
              >
                {formatFilterValue(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            title="Status"
            accessibilityLabel="Status"
            tintColor={theme.text}
          >
            {statuses.map((value) => (
              <Stack.Toolbar.MenuAction
                key={`status-${value}`}
                isOn={status === value}
                onPress={() => setStatus(value)}
              >
                {formatFilterValue(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            title="Priority"
            accessibilityLabel="Priority"
            tintColor={theme.text}
          >
            {priorities.map((value) => (
              <Stack.Toolbar.MenuAction
                key={`priority-${value}`}
                isOn={priority === value}
                onPress={() => setPriority(value)}
              >
                {formatFilterValue(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
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
                    paddingBottom: 24,
                    paddingLeft: 12 + insets.left,
                    paddingRight: 12 + insets.right,
                    borderRadius: 24,
                    overflow: "hidden",
                  },
                ]
          }
          contentContainerStyle={
            entries.length === 0
              ? styles.emptyList
              : {
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
          renderItem={({ item }) => (
            <EntryRow
              entry={item}
              onPress={() =>
                router.push({
                  pathname: "/feedback/[entryId]",
                  params: { entryId: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function EntryRow({
  entry,
  onPress,
}: {
  entry: AdminFeedbackEntry;
  onPress: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
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
