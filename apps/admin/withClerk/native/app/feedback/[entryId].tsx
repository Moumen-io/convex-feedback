import type { EntryPriority, EntryStatus } from "convex-feedback";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { adminTheme } from "@/constants/AdminTheme";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";

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
  const setStatus = feedbackHooks.useSetEntryStatus();
  const setPriority = feedbackHooks.useSetEntryPriority();
  const attachRoadmap = feedbackHooks.useAttachFeedbackToRoadmap();
  const detachRoadmap = feedbackHooks.useDetachFeedbackFromRoadmap();
  const createRoadmapForEntry = feedbackHooks.useCreateRoadmapForEntry();
  const action = useAdminAction();
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
          disabled={action.pending}
          onPress={() =>
            void action.run(
              () =>
                setStatus({
                  entryId: entry.id,
                  status: next(statuses, entry.status),
                }),
              "Could not update status",
            )
          }
        />
        <Control
          label="Priority"
          value={entry.priority ?? "none"}
          disabled={action.pending}
          onPress={() =>
            void action.run(
              () =>
                setPriority({
                  entryId: entry.id,
                  priority: next(priorities, entry.priority ?? null),
                }),
              "Could not update priority",
            )
          }
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Roadmap</Text>
        {entry.roadmap && (
          <Pressable
            disabled={action.pending}
            onPress={() =>
              void action.run(
                () => detachRoadmap({ entryId: entry.id }),
                "Could not detach roadmap item",
              )
            }
          >
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
            editable={!action.pending}
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
              disabled={action.pending}
              onPress={() =>
                void action.run(
                  () =>
                    attachRoadmap({ entryId: entry.id, roadmapId: item.id }),
                  "Could not attach roadmap item",
                )
              }
            >
              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.label}>
                {item.status.replaceAll("_", " ")}
              </Text>
            </Pressable>
          ))}
          {!!debouncedSearch.trim() &&
            debouncedSearch.trim() === roadmapSearch.trim() &&
            roadmapResults?.length === 0 && (
              <Pressable
                style={styles.create}
                disabled={action.pending}
                onPress={() =>
                  void action.run(
                    () =>
                      createRoadmapForEntry({
                        entryId: entry.id,
                        title: debouncedSearch.trim(),
                        status: "planned",
                      }),
                    "Could not create roadmap item",
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
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[styles.control, disabled && styles.disabled]}
      onPress={onPress}
    >
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
      {comments.status === "LoadingFirstPage" ? (
        <Text style={styles.label}>Loading comments…</Text>
      ) : comments.results.length === 0 ? (
        <Text style={styles.label}>No comments yet.</Text>
      ) : (
        comments.results.map((comment) => (
          <AdminCommentBranch
            key={comment.id}
            entryId={entryId}
            comment={comment}
          />
        ))
      )}
      {(comments.status === "CanLoadMore" ||
        comments.status === "LoadingMore") && (
        <LoadMoreButton
          label="Load more comments"
          disabled={comments.status === "LoadingMore"}
          onPress={() => comments.loadMore(feedbackHooks.pageSizes.comments)}
        />
      )}
    </View>
  );
}

function AdminCommentBranch({
  entryId,
  comment,
}: {
  entryId: string;
  comment: ReturnType<typeof feedbackHooks.useComments>["results"][number];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.comment}>
      <Text style={styles.label}>{comment.actorId}</Text>
      <Text style={styles.commentBody}>
        {comment.body ?? "Comment deleted"}
      </Text>
      {comment.replyCount > 0 && (
        <>
          <Pressable onPress={() => setExpanded((value) => !value)}>
            <Text style={styles.replyToggle}>
              {expanded
                ? "Hide replies"
                : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
            </Text>
          </Pressable>
          {expanded && (
            <AdminReplyList entryId={entryId} parentCommentId={comment.id} />
          )}
        </>
      )}
    </View>
  );
}

function AdminReplyList({
  entryId,
  parentCommentId,
}: {
  entryId: string;
  parentCommentId: string;
}) {
  const replies = feedbackHooks.useComments({
    entryId,
    parentCommentId,
    sort: "oldest",
  });

  return (
    <View style={styles.replies}>
      {replies.status === "LoadingFirstPage" ? (
        <Text style={styles.label}>Loading replies…</Text>
      ) : replies.results.length === 0 ? (
        <Text style={styles.label}>No replies yet.</Text>
      ) : (
        replies.results.map((reply) => (
          <AdminCommentBranch
            key={reply.id}
            entryId={entryId}
            comment={reply}
          />
        ))
      )}
      {(replies.status === "CanLoadMore" ||
        replies.status === "LoadingMore") && (
        <LoadMoreButton
          label="Load more replies"
          disabled={replies.status === "LoadingMore"}
          onPress={() => replies.loadMore(feedbackHooks.pageSizes.replies)}
        />
      )}
    </View>
  );
}

function LoadMoreButton({
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
      style={[styles.loadMore, disabled && styles.disabled]}
      onPress={onPress}
    >
      {disabled ? (
        <ActivityIndicator color={adminTheme.primary} />
      ) : (
        <Text style={styles.loadMoreText}>{label}</Text>
      )}
    </Pressable>
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
  disabled: { opacity: 0.5 },
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
  replyToggle: { color: adminTheme.primary, fontSize: 12, fontWeight: "600" },
  replies: {
    gap: 4,
    borderLeftWidth: 2,
    borderColor: adminTheme.border,
    marginLeft: 4,
    paddingLeft: 12,
  },
  loadMore: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 10,
    backgroundColor: adminTheme.surface,
    paddingHorizontal: 12,
  },
  loadMoreText: { color: adminTheme.primary, fontSize: 12, fontWeight: "600" },
});
