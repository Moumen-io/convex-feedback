import type { EntryPriority, EntryStatus } from "convex-feedback";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const statuses: EntryStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
];
const priorities: (EntryPriority | null)[] = [null, "low", "medium", "high"];

function next<T>(values: T[], current: T): T {
  return values[(values.indexOf(current) + 1) % values.length]!;
}

export default function FeedbackDetailScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = feedbackHooks.useAdminEntry(entryId);
  const tags = useTags();
  const setStatus = feedbackHooks.useSetEntryStatus();
  const setPriority = feedbackHooks.useSetEntryPriority();
  const attachTag = feedbackHooks.useAttachTag();
  const detachTag = feedbackHooks.useDetachTag();
  const attachRoadmap = feedbackHooks.useAttachFeedbackToRoadmap();
  const detachRoadmap = feedbackHooks.useDetachFeedbackFromRoadmap();
  const createRoadmap = feedbackHooks.useCreateRoadmap();
  const [roadmapSearch, setRoadmapSearch] = useState("");
  const debouncedSearch = useDebouncedValue(roadmapSearch, 300);
  const roadmapResults = feedbackHooks.useSearchRoadmap(debouncedSearch);

  if (entry === undefined)
    return (
      <ActivityIndicator style={styles.loader} color={adminTheme.primary} />
    );
  if (entry === null)
    return (
      <View style={styles.center}>
        <Text>Feedback not found.</Text>
      </View>
    );

  const cycleTag = async (placement: "primary" | "secondary") => {
    const current =
      placement === "primary" ? entry.primaryTag : entry.secondaryTag;
    const currentIndex = current
      ? (tags?.findIndex((tag) => tag.id === current.id) ?? -1) + 1
      : 0;
    const nextIndex = (currentIndex + 1) % ((tags?.length ?? 0) + 1);
    try {
      if (nextIndex === 0) await detachTag({ entryId: entry.id, placement });
      else
        await attachTag({
          entryId: entry.id,
          placement,
          tagId: tags![nextIndex - 1]!.id,
        });
    } catch (error) {
      Alert.alert(
        "Could not update tag",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.badges}>
        <Text style={styles.badge}>{entry.kind.replaceAll("_", " ")}</Text>
        <Text style={styles.identifier}>#{entry.id.slice(-6)}</Text>
      </View>
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.body}>{entry.body}</Text>
      <Text style={styles.stats}>
        {entry.upvoteCount} upvotes · {entry.commentCount} comments
      </Text>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Triage</Text>
      <View style={styles.controls}>
        <Control
          label="Status"
          value={entry.status.replaceAll("_", " ")}
          onPress={() =>
            void setStatus({
              entryId: entry.id,
              status: next(statuses, entry.status),
            })
          }
        />
        <Control
          label="Priority"
          value={entry.priority ?? "none"}
          onPress={() =>
            void setPriority({
              entryId: entry.id,
              priority: next(priorities, entry.priority ?? null),
            })
          }
        />
        <Control
          label="Primary tag"
          value={entry.primaryTag?.name ?? "none"}
          onPress={() => void cycleTag("primary")}
        />
        <Control
          label="Secondary tag"
          value={entry.secondaryTag?.name ?? "none"}
          onPress={() => void cycleTag("secondary")}
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Roadmap</Text>
        {entry.roadmap && (
          <Pressable onPress={() => void detachRoadmap({ entryId: entry.id })}>
            <Text style={styles.delete}>Detach</Text>
          </Pressable>
        )}
      </View>
      {entry.roadmap ? (
        <View style={styles.roadmapAttached}>
          <Text style={styles.controlValue}>{entry.roadmap.title}</Text>
          <Text style={styles.label}>
            {entry.roadmap.status.replaceAll("_", " ")}
          </Text>
        </View>
      ) : (
        <View style={styles.roadmapSearch}>
          <TextInput
            value={roadmapSearch}
            onChangeText={setRoadmapSearch}
            placeholder="Search roadmap items"
            placeholderTextColor={adminTheme.muted}
            style={styles.input}
          />
          {(roadmapResults ?? []).map((item) => (
            <Pressable
              key={item.id}
              style={styles.result}
              onPress={() =>
                void attachRoadmap({ entryId: entry.id, roadmapId: item.id })
              }
            >
              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.label}>
                {item.status.replaceAll("_", " ")}
              </Text>
            </Pressable>
          ))}
          {!!debouncedSearch.trim() && roadmapResults?.length === 0 && (
            <Pressable
              style={styles.create}
              onPress={() =>
                void createRoadmap({
                  title: roadmapSearch.trim(),
                  status: "planned",
                }).then(
                  (roadmapId) =>
                    typeof roadmapId === "string" &&
                    attachRoadmap({ entryId: entry.id, roadmapId }),
                )
              }
            >
              <Text style={styles.createText}>
                Create “{roadmapSearch.trim()}”
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.divider} />
      <Discussion entryId={entry.id} />
    </ScrollView>
  );
}

function Control({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.control} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.controlValue}>{value}</Text>
    </Pressable>
  );
}

function Discussion({ entryId }: { entryId: string }) {
  const comments = feedbackHooks.useComments({ entryId, sort: "oldest" });
  return (
    <View style={styles.discussion}>
      <Text style={styles.sectionTitle}>Discussion</Text>
      <FlatList
        scrollEnabled={false}
        data={comments.results}
        keyExtractor={(comment) => comment.id}
        ListEmptyComponent={<Text style={styles.label}>No comments yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.label}>{item.actorId}</Text>
            <Text style={styles.commentBody}>
              {item.body ?? "Comment deleted"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  content: { gap: 12, padding: 20, paddingBottom: 60 },
  loader: { flex: 1, backgroundColor: adminTheme.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  badges: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    borderRadius: 999,
    backgroundColor: adminTheme.primarySoft,
    color: adminTheme.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  identifier: { color: adminTheme.muted, fontSize: 12 },
  title: {
    color: adminTheme.text,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  body: { color: adminTheme.muted, fontSize: 15, lineHeight: 23 },
  stats: { color: adminTheme.muted, fontSize: 12 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: adminTheme.border,
    marginVertical: 6,
  },
  sectionTitle: { color: adminTheme.text, fontSize: 15, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  control: {
    width: "48%",
    gap: 4,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    padding: 12,
  },
  label: { color: adminTheme.muted, fontSize: 11, textTransform: "capitalize" },
  controlValue: {
    color: adminTheme.text,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  roadmapAttached: {
    gap: 5,
    borderRadius: 12,
    backgroundColor: adminTheme.primarySoft,
    padding: 14,
  },
  roadmapSearch: { gap: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    color: adminTheme.text,
    paddingHorizontal: 13,
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: adminTheme.border,
    padding: 12,
  },
  resultTitle: { flex: 1, color: adminTheme.text, fontSize: 14 },
  create: {
    borderRadius: 10,
    backgroundColor: adminTheme.primarySoft,
    padding: 12,
  },
  createText: { color: adminTheme.primary, fontWeight: "700" },
  delete: { color: adminTheme.danger, fontWeight: "600" },
  discussion: { gap: 8 },
  comment: {
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: adminTheme.border,
    paddingVertical: 10,
  },
  commentBody: { color: adminTheme.text, fontSize: 14, lineHeight: 20 },
});
