import type { EntryPriority, EntryStatus } from "convex-feedback";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";
import { MetadataModal } from "@/components/metadata-modal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { roadmapRouteParams } from "@/lib/roadmap-route";

const statuses: { value: EntryStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];
const priorities: { value: EntryPriority | null; label: string }[] = [
  { value: null, label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function displayValue(value: string): string {
  return value.replaceAll("_", " ");
}

export default function FeedbackDetailScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const entry = feedbackHooks.useAdminEntry(entryId);
  const setStatus = feedbackHooks.useSetEntryStatus();
  const setPriority = feedbackHooks.useSetEntryPriority();
  const setEntryUpvote = feedbackHooks.useSetEntryUpvote();
  const attachRoadmap = feedbackHooks.useAttachFeedbackToRoadmap();
  const detachRoadmap = feedbackHooks.useDetachFeedbackFromRoadmap();
  const createRoadmapForEntry = feedbackHooks.useCreateRoadmapForEntry();
  const action = useAdminAction();
  const upvoteAction = useAdminAction();
  const [roadmapSearch, setRoadmapSearch] = useState("");
  const [metadataOpen, setMetadataOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(roadmapSearch, 300);
  const roadmapResults = feedbackHooks.useSearchRoadmap(debouncedSearch);
  const closeIcon = useToolbarIcon("xmark", "close");
  const statusIcon = useToolbarIcon("checkmark.circle", "check_circle");
  const priorityIcon = useToolbarIcon("flag", "flag");
  const metadataIcon = useToolbarIcon("info.circle", "info");
  const editIcon = useToolbarIcon("pencil", "edit");

  return (
    <>
      <Stack.Screen options={{ title: entry?.title ?? "Feedback" }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={closeIcon}
          accessibilityLabel="Close feedback details"
          onPress={() => router.back()}
          tintColor={theme.text}
        >
          Close
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {entry && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu
            icon={statusIcon}
            title="Status"
            accessibilityLabel="Change status"
            disabled={action.pending}
            tintColor={theme.text}
          >
            {statuses.map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                key={value}
                isOn={entry.status === value}
                disabled={action.pending}
                onPress={() =>
                  void action.run(
                    () => setStatus({ entryId: entry.id, status: value }),
                    "Could not update status",
                  )
                }
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            icon={priorityIcon}
            title="Priority"
            accessibilityLabel="Change priority"
            disabled={action.pending}
            tintColor={theme.text}
          >
            {priorities.map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                key={value ?? "none"}
                isOn={(entry.priority ?? null) === value}
                disabled={action.pending}
                onPress={() =>
                  void action.run(
                    () =>
                      setPriority({
                        entryId: entry.id,
                        priority: value,
                      }),
                    "Could not update priority",
                  )
                }
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          {entry.metadata !== undefined && (
            <Stack.Toolbar.Button
              icon={metadataIcon}
              accessibilityLabel="Show metadata"
              onPress={() => setMetadataOpen(true)}
              tintColor={theme.text}
            >
              Metadata
            </Stack.Toolbar.Button>
          )}
          <Stack.Toolbar.Button
            icon={editIcon}
            accessibilityLabel="Edit feedback"
            onPress={() =>
              router.push({
                pathname: "/feedback/[entryId]/edit",
                params: { entryId: entry.id },
              })
            }
            tintColor={theme.primary}
          >
            Edit
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
      {entry === undefined ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : entry === null ? (
        <View style={styles.center}>
          <Text style={styles.body}>Feedback not found.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.screen}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            {
              paddingLeft: 20 + insets.left,
              paddingRight: 20 + insets.right,
              paddingBottom: 20,
            },
          ]}
        >
          <View style={styles.badges}>
            <Text style={styles.badge}>{displayValue(entry.kind)}</Text>
            <Text selectable style={styles.identifier}>
              #{entry.id}
            </Text>
          </View>
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.body}>{entry.body}</Text>
          <Text style={styles.stats}>{entry.commentCount} comments</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              entry.viewerHasUpvoted ? "Remove entry upvote" : "Upvote entry"
            }
            accessibilityState={{
              disabled: upvoteAction.pending,
              selected: entry.viewerHasUpvoted,
            }}
            disabled={upvoteAction.pending}
            style={({ pressed }) => [
              styles.upvoteButton,
              entry.viewerHasUpvoted && styles.upvoteButtonActive,
              pressed && styles.pressed,
              upvoteAction.pending && styles.disabled,
            ]}
            onPress={() =>
              void upvoteAction.run(
                () =>
                  setEntryUpvote({
                    entryId: entry.id,
                    desiredState: !entry.viewerHasUpvoted,
                  }),
                "Could not update entry upvote",
              )
            }
          >
            <Text
              style={[
                styles.upvoteText,
                entry.viewerHasUpvoted && styles.upvoteTextActive,
              ]}
            >
              {entry.viewerHasUpvoted ? "▲ Upvoted" : "▲ Upvote"}
            </Text>
            <Text
              style={[
                styles.upvoteCount,
                entry.viewerHasUpvoted && styles.upvoteTextActive,
              ]}
            >
              {entry.upvoteCount}
            </Text>
          </Pressable>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Triage</Text>
          <View style={styles.controls}>
            <InfoControl label="Status" value={displayValue(entry.status)} />
            <InfoControl label="Priority" value={entry.priority ?? "None"} />
          </View>
          <Text style={styles.hint}>
            Use the Status and Priority menus in the native header to update
            triage.
          </Text>
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
              <Pressable
                style={({ pressed }) => [
                  styles.roadmapLink,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/roadmap/[roadmapId]",
                    params: roadmapRouteParams(entry.roadmap!),
                  })
                }
              >
                <Text style={styles.controlValue}>{entry.roadmap.title}</Text>
                <Text style={styles.label}>
                  {displayValue(entry.roadmap.status)}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.roadmapSearch}>
              <TextInput
                editable={!action.pending}
                value={roadmapSearch}
                onChangeText={setRoadmapSearch}
                placeholder="Search roadmap items"
                placeholderTextColor={theme.muted}
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
                        attachRoadmap({
                          entryId: entry.id,
                          roadmapId: item.id,
                        }),
                      "Could not attach roadmap item",
                    )
                  }
                >
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.label}>{displayValue(item.status)}</Text>
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
      )}
      {entry && entry.metadata !== undefined && (
        <MetadataModal
          metadata={entry.metadata}
          entryTitle={entry.title}
          visible={metadataOpen}
          onClose={() => setMetadataOpen(false)}
        />
      )}
    </>
  );
}

function InfoControl({ label, value }: { label: string; value: string }) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.control}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.controlValue}>{value}</Text>
    </View>
  );
}

function Discussion({ entryId }: { entryId: string }) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const comments = feedbackHooks.useComments({ entryId, sort: "oldest" });
  const createComment = feedbackHooks.useCreateComment();
  const commentAction = useAdminAction();
  const [body, setBody] = useState("");

  return (
    <View style={styles.discussion}>
      <Text style={styles.sectionTitle}>Discussion</Text>
      <View style={styles.commentComposer}>
        <TextInput
          editable={!commentAction.pending}
          multiline
          numberOfLines={3}
          onChangeText={setBody}
          placeholder="Add a comment"
          placeholderTextColor={theme.muted}
          style={styles.commentInput}
          textAlignVertical="top"
          value={body}
        />
        <Pressable
          accessibilityRole="button"
          disabled={commentAction.pending || body.trim().length === 0}
          style={({ pressed }) => [
            styles.commentSubmit,
            (commentAction.pending || body.trim().length === 0) &&
              styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            const trimmedBody = body.trim();
            if (trimmedBody.length === 0) return;
            void commentAction.run(async () => {
              await createComment({ entryId, body: trimmedBody });
              setBody("");
            }, "Could not add comment");
          }}
        >
          {commentAction.pending ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={styles.commentSubmitText}>Comment</Text>
          )}
        </Pressable>
      </View>
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
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const setCommentLike = feedbackHooks.useSetCommentLike();
  const createComment = feedbackHooks.useCreateComment();
  const likeAction = useAdminAction();
  const replyAction = useAdminAction();

  const toggleLike = () => {
    if (likeAction.pending) return;
    void likeAction.run(
      () =>
        setCommentLike({
          commentId: comment.id,
          desiredState: !comment.viewerHasLiked,
        }),
      comment.viewerHasLiked
        ? "Could not remove comment like"
        : "Could not like comment",
    );
  };

  return (
    <View style={styles.comment}>
      <Text style={styles.label}>{comment.actorId}</Text>
      <Text style={styles.commentBody}>
        {comment.body ?? "Comment deleted"}
      </Text>
      <View style={styles.commentActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            comment.viewerHasLiked ? "Remove comment like" : "Like comment"
          }
          accessibilityState={{
            disabled: likeAction.pending,
            selected: comment.viewerHasLiked,
          }}
          disabled={likeAction.pending}
          style={({ pressed }) => [
            styles.commentAction,
            comment.viewerHasLiked && styles.commentActionActive,
            pressed && styles.pressed,
            likeAction.pending && styles.disabled,
          ]}
          onPress={toggleLike}
        >
          <Text
            style={[
              styles.commentActionText,
              comment.viewerHasLiked && styles.commentActionTextActive,
            ]}
          >
            {comment.viewerHasLiked ? "♥" : "♡"} {comment.likeCount}
          </Text>
        </Pressable>
        {comment.body !== null && (
          <Pressable
            accessibilityRole="button"
            disabled={replyAction.pending}
            style={({ pressed }) => [
              styles.commentAction,
              pressed && styles.pressed,
              replyAction.pending && styles.disabled,
            ]}
            onPress={() => setReplying((value) => !value)}
          >
            <Text style={styles.commentActionText}>Reply</Text>
          </Pressable>
        )}
      </View>
      {replying && (
        <View style={styles.replyComposer}>
          <TextInput
            editable={!replyAction.pending}
            multiline
            numberOfLines={2}
            onChangeText={setReplyBody}
            placeholder="Write a reply"
            placeholderTextColor={theme.muted}
            style={styles.replyInput}
            textAlignVertical="top"
            value={replyBody}
          />
          <View style={styles.replyComposerActions}>
            <Pressable
              accessibilityRole="button"
              disabled={replyAction.pending || replyBody.trim().length === 0}
              style={({ pressed }) => [
                styles.commentSubmit,
                (replyAction.pending || replyBody.trim().length === 0) &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                const trimmedBody = replyBody.trim();
                if (trimmedBody.length === 0) return;
                void replyAction.run(async () => {
                  await createComment({
                    entryId,
                    parentCommentId: comment.id,
                    body: trimmedBody,
                  });
                  setReplyBody("");
                  setReplying(false);
                  setExpanded(true);
                }, "Could not add reply");
              }}
            >
              {replyAction.pending ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={styles.commentSubmitText}>Reply</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={replyAction.pending}
              onPress={() => setReplying(false)}
            >
              <Text style={styles.replyCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  const theme = useAdminTheme();
  const styles = createStyles(theme);
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
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      disabled={disabled}
      style={[styles.loadMore, disabled && styles.disabled]}
      onPress={onPress}
    >
      {disabled ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <Text style={styles.loadMoreText}>{label}</Text>
      )}
    </Pressable>
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { gap: 12, paddingTop: 20 },
    loader: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    badges: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: {
      borderRadius: 999,
      backgroundColor: theme.primarySoft,
      color: theme.primary,
      paddingHorizontal: 9,
      paddingVertical: 5,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    identifier: { flex: 1, color: theme.muted, fontSize: 12 },
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "700",
      lineHeight: 30,
    },
    body: { color: theme.muted, fontSize: 15, lineHeight: 23 },
    stats: { color: theme.muted, fontSize: 12 },
    upvoteButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 999,
      backgroundColor: theme.surface,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    upvoteButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },
    upvoteText: { color: theme.text, fontSize: 13, fontWeight: "700" },
    upvoteTextActive: { color: theme.primary },
    upvoteCount: { color: theme.muted, fontSize: 13, fontWeight: "700" },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginVertical: 6,
    },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: "700" },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    control: {
      minWidth: "48%",
      flexGrow: 1,
      gap: 4,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.surface,
      padding: 12,
    },
    disabled: { opacity: 0.5 },
    label: { color: theme.muted, fontSize: 11, textTransform: "capitalize" },
    controlValue: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    hint: { color: theme.muted, fontSize: 12, lineHeight: 18 },
    roadmapAttached: {
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
      padding: 14,
    },
    roadmapLink: { gap: 5 },
    pressed: { opacity: 0.7 },
    roadmapSearch: { gap: 8 },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.input,
      color: theme.text,
      paddingHorizontal: 13,
    },
    result: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      padding: 12,
    },
    resultTitle: { flex: 1, color: theme.text, fontSize: 14 },
    create: {
      borderRadius: 10,
      backgroundColor: theme.primarySoft,
      padding: 12,
    },
    createText: { color: theme.primary, fontWeight: "700" },
    delete: { color: theme.danger, fontWeight: "600" },
    discussion: { gap: 8 },
    commentComposer: { gap: 8 },
    commentInput: {
      minHeight: 84,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.input,
      color: theme.text,
      padding: 12,
    },
    commentSubmit: {
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      minHeight: 38,
      borderRadius: 10,
      backgroundColor: theme.primarySoft,
      paddingHorizontal: 14,
    },
    commentSubmitText: { color: theme.primary, fontWeight: "700" },
    comment: {
      gap: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      paddingVertical: 10,
    },
    commentBody: { color: theme.text, fontSize: 14, lineHeight: 20 },
    commentActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    commentAction: {
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 5,
    },
    commentActionActive: { backgroundColor: theme.primarySoft },
    commentActionText: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    commentActionTextActive: { color: theme.primary },
    replyComposer: { gap: 8, marginTop: 4 },
    replyInput: {
      minHeight: 68,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      backgroundColor: theme.input,
      color: theme.text,
      padding: 10,
    },
    replyComposerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    replyCancel: { color: theme.muted, fontSize: 12, fontWeight: "600" },
    replyToggle: { color: theme.primary, fontSize: 12, fontWeight: "600" },
    replies: {
      gap: 4,
      borderLeftWidth: 2,
      borderColor: theme.border,
      marginLeft: 4,
      paddingLeft: 12,
    },
    loadMore: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
    },
    loadMoreText: { color: theme.primary, fontSize: 12, fontWeight: "600" },
  });
}
