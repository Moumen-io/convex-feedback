import type {
  AdminFeedbackEntry,
  EntryPriority,
  EntryStatus,
  RoadmapItem,
} from "convex-feedback";
import type { FeedbackHooks } from "convex-feedback/react";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MetadataModal } from "../components/metadata-modal.js";
import { useDebouncedValue } from "../hooks/use-debounced-value.js";
import { useAdminAction } from "../lib/action.js";
import { useAdminFeedbackHooks } from "../lib/feedback.js";
import { useToolbarIcon } from "../lib/toolbar-icon.js";
import { useAdminTheme, type AdminTheme } from "../theme.js";

function displayValue(value: string): string {
  return value.replaceAll("_", " ");
}

interface FeedbackDetailToolbarProps {
  entry: AdminFeedbackEntry | null | undefined;
  pending: boolean;
  onClose: () => void;
  onEdit: (entryId: string) => void;
  onDelete: () => void;
  onStatusChange: (status: EntryStatus) => void;
  onPriorityChange: (priority: EntryPriority | null) => void;
  onShowMetadata: () => void;
}

export interface FeedbackDetailScreenProps {
  entryId: string;
  onClose: () => void;
  onEdit: (entryId: string) => void;
  onOpenRoadmap: (roadmap: RoadmapItem) => void;
}

export function FeedbackDetailScreen({
  entryId,
  onClose,
  onEdit,
  onOpenRoadmap,
}: FeedbackDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const hooks = useAdminFeedbackHooks();
  const entry = hooks.useAdminEntry(entryId);
  const setStatus = hooks.useSetEntryStatus();
  const setPriority = hooks.useSetEntryPriority();
  const setEntryUpvote = hooks.useSetEntryUpvote();
  const attachRoadmap = hooks.useAttachFeedbackToRoadmap();
  const detachRoadmap = hooks.useDetachFeedbackFromRoadmap();
  const createRoadmapForEntry = hooks.useCreateRoadmapForEntry();
  const removeEntry = hooks.useDeleteEntry();
  const action = useAdminAction();
  const deleteAction = useAdminAction();
  const upvoteAction = useAdminAction();
  const [roadmapSearch, setRoadmapSearch] = useState("");
  const [metadataOpen, setMetadataOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(roadmapSearch, 300);
  const roadmapResults = hooks.useSearchRoadmap(debouncedSearch);
  const screenPending = action.pending || deleteAction.pending;

  const changeStatus = (status: EntryStatus) => {
    if (!entry || deleteAction.pending) return;
    void action.run(
      () => setStatus({ entryId: entry.id, status }),
      "Could not update status",
    );
  };

  const changePriority = (priority: EntryPriority | null) => {
    if (!entry || deleteAction.pending) return;
    void action.run(
      () => setPriority({ entryId: entry.id, priority }),
      "Could not update priority",
    );
  };

  const showMetadata = () => {
    if (!entry || screenPending) return;
    if (entry.metadata === undefined) {
      Alert.alert(
        "Metadata was not collected",
        "To collect metadata, pass the `collectMetadata` option to the Feedback Component or manually collect it and attach it to the entry if you're using the primitives/hooks directly.",
      );
      return;
    }
    setMetadataOpen(true);
  };

  const deleteFeedback = async () => {
    if (!entry) return;
    const succeeded = await deleteAction.run(
      () => removeEntry({ entryId: entry.id }),
      "Could not delete feedback",
    );
    if (succeeded) onClose();
  };

  const confirmDelete = () => {
    if (!entry || screenPending) return;
    Alert.alert(
      "Delete feedback?",
      "This permanently deletes the feedback. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteFeedback(),
        },
      ],
    );
  };

  return (
    <>
      <FeedbackToolbar
        entry={entry}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={confirmDelete}
        onPriorityChange={changePriority}
        onShowMetadata={showMetadata}
        onStatusChange={changeStatus}
        pending={screenPending}
      />
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          automaticallyAdjustKeyboardInsets
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
              disabled: upvoteAction.pending || deleteAction.pending,
              selected: entry.viewerHasUpvoted,
            }}
            disabled={upvoteAction.pending || deleteAction.pending}
            style={({ pressed }) => [
              styles.upvoteButton,
              entry.viewerHasUpvoted && styles.upvoteButtonActive,
              pressed && styles.pressed,
              (upvoteAction.pending || deleteAction.pending) && styles.disabled,
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
                disabled={screenPending}
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
                onPress={() => onOpenRoadmap(entry.roadmap!)}
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
                editable={!screenPending}
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
                  disabled={screenPending}
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
                    disabled={screenPending}
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
          <Discussion entryId={entry.id} disabled={deleteAction.pending} />
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

function FeedbackToolbar({
  entry,
  onClose,
  onEdit,
  onDelete,
  onPriorityChange,
  onShowMetadata,
  onStatusChange,
  pending,
}: FeedbackDetailToolbarProps) {
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const statusIcon = useToolbarIcon("checkmark.circle", "check_circle");
  const priorityIcon = useToolbarIcon("flag", "flag");
  const metadataIcon = useToolbarIcon("info.circle", "info");
  const editIcon = useToolbarIcon("pencil", "edit");
  const actionsIcon = useToolbarIcon("ellipsis.circle", "more_vert");

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

  return (
    <>
      <Stack.Screen options={{ title: entry?.title ?? "Feedback" }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close feedback details"
          disabled={pending}
          icon={closeIcon}
          onPress={onClose}
          tintColor={theme.text}
        >
          Close
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {entry && (
        <Stack.Toolbar placement={Platform.OS === "ios" ? "bottom" : "right"}>
          <Stack.Toolbar.Menu
            destructive
            accessibilityLabel="Feedback actions"
            disabled={pending}
            icon={actionsIcon}
            tintColor={theme.text}
            title="Actions"
          >
            <Stack.Toolbar.MenuAction
              destructive
              disabled={pending}
              onPress={onDelete}
            >
              Delete
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Spacer hidden={Platform.OS !== "ios"} />
          <Stack.Toolbar.Button
            accessibilityLabel="Edit feedback"
            disabled={pending}
            icon={editIcon}
            onPress={() => onEdit(entry.id)}
            tintColor={theme.primary}
          >
            Edit
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Spacer hidden={Platform.OS !== "ios"} />
          <Stack.Toolbar.Menu
            accessibilityLabel="Change status"
            disabled={pending}
            icon={statusIcon}
            tintColor={theme.text}
            title="Status"
          >
            {statuses.map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                disabled={pending}
                isOn={entry.status === value}
                key={value}
                onPress={() => onStatusChange(value)}
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            accessibilityLabel="Change priority"
            disabled={pending}
            icon={priorityIcon}
            tintColor={theme.text}
            title="Priority"
          >
            {priorities.map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                disabled={pending}
                isOn={(entry.priority ?? null) === value}
                key={value ?? "none"}
                onPress={() => onPriorityChange(value)}
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Button
            accessibilityLabel="Show metadata"
            disabled={pending}
            icon={metadataIcon}
            onPress={onShowMetadata}
            tintColor={
              entry.metadata === undefined ? theme.warning : theme.text
            }
          >
            Metadata
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
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

function Discussion({
  entryId,
  disabled,
}: {
  entryId: string;
  disabled: boolean;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const hooks = useAdminFeedbackHooks();
  const comments = hooks.useComments({ entryId, sort: "oldest" });
  const createComment = hooks.useCreateComment();
  const commentAction = useAdminAction();
  const [body, setBody] = useState("");

  return (
    <View style={styles.discussion}>
      <Text style={styles.sectionTitle}>Discussion</Text>
      <View style={styles.commentComposer}>
        <TextInput
          editable={!disabled && !commentAction.pending}
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
          disabled={
            disabled || commentAction.pending || body.trim().length === 0
          }
          style={({ pressed }) => [
            styles.commentSubmit,
            (disabled || commentAction.pending || body.trim().length === 0) &&
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
            disabled={disabled}
          />
        ))
      )}
      {(comments.status === "CanLoadMore" ||
        comments.status === "LoadingMore") && (
        <LoadMoreButton
          label="Load more comments"
          disabled={disabled || comments.status === "LoadingMore"}
          onPress={() => comments.loadMore(hooks.pageSizes.comments)}
        />
      )}
    </View>
  );
}

function AdminCommentBranch({
  entryId,
  comment,
  disabled,
}: {
  entryId: string;
  comment: ReturnType<FeedbackHooks["useComments"]>["results"][number];
  disabled: boolean;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const hooks = useAdminFeedbackHooks();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const setCommentLike = hooks.useSetCommentLike();
  const createComment = hooks.useCreateComment();
  const likeAction = useAdminAction();
  const replyAction = useAdminAction();

  const toggleLike = () => {
    if (disabled || likeAction.pending) return;
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
            disabled: disabled || likeAction.pending,
            selected: comment.viewerHasLiked,
          }}
          disabled={disabled || likeAction.pending}
          style={({ pressed }) => [
            styles.commentAction,
            comment.viewerHasLiked && styles.commentActionActive,
            pressed && styles.pressed,
            (disabled || likeAction.pending) && styles.disabled,
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
            disabled={disabled || replyAction.pending}
            style={({ pressed }) => [
              styles.commentAction,
              pressed && styles.pressed,
              (disabled || replyAction.pending) && styles.disabled,
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
            editable={!disabled && !replyAction.pending}
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
              disabled={
                disabled || replyAction.pending || replyBody.trim().length === 0
              }
              style={({ pressed }) => [
                styles.commentSubmit,
                (disabled ||
                  replyAction.pending ||
                  replyBody.trim().length === 0) &&
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
              disabled={disabled || replyAction.pending}
              onPress={() => setReplying(false)}
            >
              <Text style={styles.replyCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      {comment.replyCount > 0 && (
        <>
          <Pressable
            disabled={disabled}
            onPress={() => setExpanded((value) => !value)}
          >
            <Text style={styles.replyToggle}>
              {expanded
                ? "Hide replies"
                : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
            </Text>
          </Pressable>
          {expanded && (
            <AdminReplyList
              disabled={disabled}
              entryId={entryId}
              parentCommentId={comment.id}
            />
          )}
        </>
      )}
    </View>
  );
}

function AdminReplyList({
  entryId,
  parentCommentId,
  disabled,
}: {
  entryId: string;
  parentCommentId: string;
  disabled: boolean;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const hooks = useAdminFeedbackHooks();
  const replies = hooks.useComments({
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
            disabled={disabled}
          />
        ))
      )}
      {(replies.status === "CanLoadMore" ||
        replies.status === "LoadingMore") && (
        <LoadMoreButton
          label="Load more replies"
          disabled={disabled || replies.status === "LoadingMore"}
          onPress={() => replies.loadMore(hooks.pageSizes.replies)}
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
