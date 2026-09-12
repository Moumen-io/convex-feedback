import type {
  AdminFeedbackEntry,
  EntryKind,
  EntryPriority,
  EntryStatus,
} from "convex-feedback";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { adminTheme } from "@/constants/AdminTheme";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { feedbackHooks } from "@/lib/feedback";
import { useTags } from "@/providers/tags-provider";

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

function nextValue<T extends string>(values: readonly T[], current: T): T {
  return values[(values.indexOf(current) + 1) % values.length]!;
}

export default function InboxScreen() {
  const router = useRouter();
  const tags = useTags();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("all");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("all");
  const [tagIndex, setTagIndex] = useState(0);
  const debounced = useDebouncedValue(search, 300);
  const selectedTag = tagIndex === 0 ? undefined : tags?.[tagIndex - 1];
  const filters = useMemo(
    () => ({
      ...(kind === "all" ? {} : { kinds: [kind as EntryKind] }),
      ...(status === "all" ? {} : { status: status as EntryStatus }),
      ...(priority === "all" ? {} : { priority: priority as EntryPriority }),
      ...(selectedTag ? { tagId: selectedTag.id } : {}),
      limit: 100,
    }),
    [kind, priority, selectedTag, status],
  );
  const listed = feedbackHooks.useAdminEntries(filters);
  const searched = feedbackHooks.useAdminSearchEntries({
    searchQuery: debounced,
    ...filters,
  });
  const entries = debounced.trim() ? searched : listed;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.subtitle}>Triage customer signals</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search feedback"
          placeholderTextColor={adminTheme.muted}
          style={styles.search}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Filter
          label={`Kind · ${kind.replaceAll("_", " ")}`}
          onPress={() => setKind(nextValue(kinds, kind))}
        />
        <Filter
          label={`Status · ${status.replaceAll("_", " ")}`}
          onPress={() => setStatus(nextValue(statuses, status))}
        />
        <Filter
          label={`Priority · ${priority}`}
          onPress={() => setPriority(nextValue(priorities, priority))}
        />
        <Filter
          label={`Tag · ${selectedTag?.name ?? "all"}`}
          onPress={() =>
            setTagIndex((value) => (value + 1) % ((tags?.length ?? 0) + 1))
          }
        />
      </ScrollView>
      {entries === undefined ? (
        <ActivityIndicator style={styles.loader} color={adminTheme.primary} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={
            entries.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No feedback matches these filters.</Text>
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

function Filter({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.filter}>
      <Text style={styles.filterText}>{label}</Text>
    </Pressable>
  );
}

function EntryRow({
  entry,
  onPress,
}: {
  entry: AdminFeedbackEntry;
  onPress: () => void;
}) {
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  header: { gap: 4, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  title: {
    color: adminTheme.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: { color: adminTheme.muted, fontSize: 14 },
  search: {
    marginTop: 12,
    height: 44,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    color: adminTheme.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  filters: { gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  filter: {
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 999,
    backgroundColor: adminTheme.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    color: adminTheme.text,
    fontSize: 12,
    textTransform: "capitalize",
  },
  loader: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  empty: { color: adminTheme.muted, textAlign: "center" },
  entry: {
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: adminTheme.border,
    backgroundColor: adminTheme.surface,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  pressed: { opacity: 0.7 },
  entryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryTitle: {
    flex: 1,
    color: adminTheme.text,
    fontSize: 15,
    fontWeight: "600",
  },
  priority: {
    color: adminTheme.primary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  body: { color: adminTheme.muted, fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  metaText: {
    color: adminTheme.muted,
    fontSize: 11,
    textTransform: "capitalize",
  },
});
