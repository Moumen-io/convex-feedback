import type { EntryKind } from "convex-feedback";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import type {
  FeedbackScreenBodyProps,
  FeedbackScreenCommentBranchProps,
  FeedbackScreenEntryCardProps,
  FeedbackScreenEntryDetailProps,
  FeedbackScreenEntryModalProps,
  FeedbackScreenReplyListProps,
  FeedbackScreenRootProps,
} from "../shared/types";
import { FeedbackProvider, useFeedbackUi } from "./context.js";
import {
  Comment,
  FeedbackBoard,
  FeedbackEntry,
  FeedbackForm,
} from "./primitives.js";

const kinds: readonly EntryKind[] = [
  "feedback",
  "feature_request",
  "bug_report",
];

const isIos26OrNewer =
  Platform.OS === "ios" &&
  Number.parseInt(String(Platform.Version).split(".")[0] ?? "0", 10) >= 26;

export function FeedbackScreen({
  hooks,
  messages,
  theme,
  unstyled,
  entrySort = "top",
  commentSort = "top",
  enabledKinds = kinds,
  maxCommentDepth = 5,
  transformComments,
  renderActor,
  ...colors
}: FeedbackScreenRootProps) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <ScreenBody
        hooks={hooks}
        entrySort={entrySort}
        commentSort={commentSort}
        enabledKinds={enabledKinds}
        maxCommentDepth={maxCommentDepth}
        transformComments={transformComments}
        renderActor={renderActor}
        {...colors}
      />
    </FeedbackProvider>
  );
}

function ScreenBody({
  hooks,
  entrySort,
  commentSort,
  enabledKinds,
  maxCommentDepth,
  transformComments,
  renderActor,
  ...colors
}: FeedbackScreenBodyProps) {
  const { messages, theme } = useFeedbackUi();
  const [query, setQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const list = hooks.useEntries({ sort: entrySort, kinds: enabledKinds });
  const search = hooks.useSearchEntries({
    searchQuery: query,
    kinds: enabledKinds,
  });

  if (selectedEntryId !== null) {
    return (
      <FeedbackBoard.Root {...colors}>
        <EntryDetail
          hooks={hooks}
          entryId={selectedEntryId}
          onBack={() => setSelectedEntryId(null)}
          commentSort={commentSort}
          maxCommentDepth={maxCommentDepth}
          transformComments={transformComments}
          renderActor={renderActor}
        />
      </FeedbackBoard.Root>
    );
  }

  const searching = query.trim().length > 0;
  const entries = searching ? search : list.results;

  return (
    <>
      <FeedbackBoard.Root {...colors}>
        <FeedbackBoard.Header>
          <FeedbackBoard.Title />
          <Text style={{ color: theme.colors.mutedText }}>
            {messages.board.subtitle}
          </Text>
          <Pressable
            onPress={() => setShowForm(true)}
            style={{
              alignSelf: "flex-start",
              paddingVertical: 9,
              paddingHorizontal: 12,
              borderRadius: 9,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>
              {messages.board.createEntry}
            </Text>
          </Pressable>
        </FeedbackBoard.Header>
        <FeedbackBoard.Search value={query} onValueChange={setQuery} />
        <FeedbackBoard.List>
          {(entries ?? []).map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              hooks={hooks}
              onOpen={() => setSelectedEntryId(entry.id)}
            />
          ))}
        </FeedbackBoard.List>
        {!searching && list.status === "CanLoadMore" ? (
          <NativeButton
            label={messages.board.loadMore}
            onPress={() => list.loadMore(hooks.pageSizes.entries)}
          />
        ) : null}
      </FeedbackBoard.Root>
      {showForm ? (
        <CreateEntryModal
          hooks={hooks}
          enabledKinds={enabledKinds}
          onRequestClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            setSelectedEntryId(id);
          }}
        />
      ) : null}
    </>
  );
}

function NativeButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useFeedbackUi();
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 11,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function EntryCard({ entry, hooks, onOpen }: FeedbackScreenEntryCardProps) {
  const setUpvote = hooks.useSetEntryUpvote();
  return (
    <FeedbackEntry.Root entry={entry}>
      <FeedbackEntry.Upvote
        onToggle={(active) =>
          void setUpvote({ entryId: entry.id, desiredState: active })
        }
      />
      <Pressable onPress={onOpen} style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <FeedbackEntry.Kind />
          <FeedbackEntry.Status />
        </View>
        <FeedbackEntry.Title />
        <FeedbackEntry.Body numberOfLines={3} />
        <FeedbackEntry.CommentCount />
      </Pressable>
    </FeedbackEntry.Root>
  );
}

function CreateEntryModal({
  hooks,
  enabledKinds,
  onRequestClose,
  onCreated,
}: FeedbackScreenEntryModalProps & {
  onRequestClose: () => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const isIos = Platform.OS === "ios";

  const [previewEntryId, setPreviewEntryId] = useState<string | null>(null);

  const [kind, setKind] = useState<EntryKind>(enabledKinds[0] ?? "feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={isIos ? "formSheet" : "overFullScreen"}
      transparent={!isIos}
      allowSwipeDismissal={isIos}
      onRequestClose={onRequestClose}
      {...(isIos
        ? {
            backdropColor: isIos26OrNewer
              ? "transparent"
              : theme.colors.background,
          }
        : {})}
    >
      <View
        style={
          isIos
            ? {
                flex: 1,
                backgroundColor: isIos26OrNewer
                  ? "transparent"
                  : theme.colors.background,
              }
            : {
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0, 0, 0, 0.35)",
              }
        }
      >
        {!isIos ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.form.cancel}
            onPress={onRequestClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />
        ) : null}

        <View
          style={
            isIos
              ? {
                  flex: 1,
                  backgroundColor: "transparent",
                }
              : {
                  maxHeight: "92%",
                  minHeight: 360,
                  overflow: "hidden",
                  borderTopLeftRadius: theme.radius * 2,
                  borderTopRightRadius: theme.radius * 2,
                  backgroundColor: theme.colors.background,
                }
          }
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              {messages.board.createEntry}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={onRequestClose}
              hitSlop={8}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "600",
                }}
              >
                {messages.form.cancel}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={isIos ? "interactive" : "on-drag"}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 32,
            }}
          >
            {previewEntryId !== null ? (
              <EntryDetail
                hooks={hooks}
                entryId={previewEntryId}
                onBack={() => setPreviewEntryId(null)}
                commentSort="top"
                maxCommentDepth={5}
              />
            ) : (
              <CreateForm
                hooks={hooks}
                enabledKinds={enabledKinds}
                kind={kind}
                onKindChange={setKind}
                title={title}
                onTitleChange={setTitle}
                body={body}
                onBodyChange={setBody}
                onCreated={onCreated}
                onOpenSuggestion={setPreviewEntryId}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreateForm({
  hooks,
  enabledKinds,
  kind,
  onKindChange,
  title,
  onTitleChange,
  body,
  onBodyChange,
  onCreated,
  onOpenSuggestion,
}: FeedbackScreenEntryModalProps & {
  kind: EntryKind;
  onKindChange: (kind: EntryKind) => void;
  title: string;
  onTitleChange: (title: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
  onOpenSuggestion: (id: string) => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const [submitting, setSubmitting] = useState(false);
  const create = hooks.useCreateEntry();
  const similar = hooks.useSimilarEntries({ title, body, kind, limit: 3 });

  const suggestions = useMemo(() => {
    if (similar === undefined) return [];
    return [...similar.exact, ...similar.similar];
  }, [similar]);

  const submit = async () => {
    if (submitting || title.trim().length === 0 || body.trim().length === 0) {
      return;
    }

    setSubmitting(true);

    try {
      onCreated(await create({ kind, title, body }));
    } finally {
      setSubmitting(false);
    }
  };

  const requestSubmit = () => {
    if (
      submitting ||
      similar === undefined ||
      title.trim().length === 0 ||
      body.trim().length === 0
    ) {
      return;
    }

    if (suggestions.length === 0) {
      void submit();
      return;
    }

    Alert.alert(
      similar.exact.length > 0
        ? messages.form.exactDuplicate
        : messages.form.possibleDuplicates,
      messages.form.duplicateWarning,
      [
        {
          text: messages.form.cancel,
          style: "cancel",
        },
        {
          text: messages.form.submitAnyway,
          onPress: () => {
            void submit();
          },
        },
      ],
    );
  };

  return (
    <FeedbackForm.Root>
      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
        {messages.form.kind}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {enabledKinds.map((value) => (
          <Pressable
            key={value}
            onPress={() => onKindChange(value)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 9,
              borderRadius: 999,
              borderWidth: 1,
              borderColor:
                value === kind ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  value === kind
                    ? theme.colors.primary
                    : theme.colors.mutedText,
              }}
            >
              {messages.kinds[value]}
            </Text>
          </Pressable>
        ))}
      </View>
      <FeedbackForm.Input
        value={title}
        onChangeText={onTitleChange}
        placeholder={messages.form.titlePlaceholder}
      />
      <FeedbackForm.Textarea
        value={body}
        onChangeText={onBodyChange}
        placeholder={messages.form.bodyPlaceholder}
      />
      {suggestions.length > 0 ? (
        <View
          style={{
            gap: 8,
            padding: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
            }}
          >
            {similar?.exact.length
              ? messages.form.exactDuplicate
              : messages.form.possibleDuplicates}
          </Text>

          {suggestions.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => onOpenSuggestion(entry.id)}
              style={{
                gap: 4,
                padding: 10,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: Math.max(8, theme.radius - 2),
                backgroundColor: theme.colors.surface,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flexShrink: 1,
                    color: theme.colors.mutedText,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {messages.kinds[entry.kind]}
                </Text>

                <Text
                  style={{
                    color: theme.colors.mutedText,
                    fontSize: 12,
                  }}
                >
                  {messages.statuses[entry.status]}
                </Text>
              </View>

              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.text,
                  fontWeight: "700",
                }}
              >
                {entry.title}
              </Text>

              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.mutedText,
                  lineHeight: 18,
                }}
              >
                {entry.body}
              </Text>

              <Text
                style={{
                  color: theme.colors.mutedText,
                  fontSize: 12,
                }}
              >
                ▲ {entry.upvoteCount} ·{" "}
                {messages.entry.comments(entry.commentCount)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FeedbackForm.Submit submitting={submitting} onPress={requestSubmit} />
    </FeedbackForm.Root>
  );
}

function EntryDetail({
  hooks,
  entryId,
  onBack,
  commentSort,
  maxCommentDepth,
  transformComments,
  renderActor,
}: FeedbackScreenEntryDetailProps) {
  const { messages, theme } = useFeedbackUi();
  const entry = hooks.useEntry(entryId);
  const comments = hooks.useComments({ entryId, sort: commentSort });
  const setUpvote = hooks.useSetEntryUpvote();
  const createComment = hooks.useCreateComment();
  const [body, setBody] = useState("");
  const visible = useMemo(
    () => transformComments?.(comments.results) ?? comments.results,
    [comments.results, transformComments],
  );

  if (entry === undefined)
    return (
      <View
        style={{
          flex: 1,
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ color: theme.colors.mutedText }}>
          {messages.board.loading}
        </Text>
      </View>
    );
  if (entry === null)
    return <NativeButton label={messages.entry.back} onPress={onBack} />;

  return (
    <View style={{ gap: 12 }}>
      <NativeButton label={messages.entry.back} onPress={onBack} />
      <FeedbackEntry.Root entry={entry}>
        <FeedbackEntry.Upvote
          onToggle={(active) =>
            void setUpvote({ entryId, desiredState: active })
          }
        />
        <FeedbackEntry.Content style={{ gap: 5 }}>
          <FeedbackEntry.Status />
          <FeedbackEntry.Title />
          <FeedbackEntry.Body />
          <FeedbackEntry.CommentCount />
        </FeedbackEntry.Content>
      </FeedbackEntry.Root>
      <Text
        style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}
      >
        {messages.comments.title}
      </Text>
      <FeedbackForm.Root>
        <FeedbackForm.Textarea
          value={body}
          onChangeText={setBody}
          placeholder={messages.comments.placeholder}
        />
        <FeedbackForm.Submit
          onPress={async () => {
            if (body.trim().length === 0) return;
            await createComment({ entryId, body });
            setBody("");
          }}
        >
          {messages.comments.submit}
        </FeedbackForm.Submit>
      </FeedbackForm.Root>
      <View style={{ gap: 8 }}>
        {visible.map((comment) => (
          <CommentBranch
            key={comment.id}
            comment={comment}
            entryId={entryId}
            hooks={hooks}
            commentSort={commentSort}
            maxCommentDepth={maxCommentDepth}
            transformComments={transformComments}
            renderActor={renderActor}
          />
        ))}
      </View>
      {comments.status === "CanLoadMore" ? (
        <NativeButton
          label={messages.comments.loadMore}
          onPress={() => comments.loadMore(hooks.pageSizes.comments)}
        />
      ) : null}
    </View>
  );
}

function CommentBranch({
  comment,
  entryId,
  hooks,
  commentSort,
  maxCommentDepth,
  transformComments,
  renderActor,
}: FeedbackScreenCommentBranchProps) {
  const { messages, theme } = useFeedbackUi();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const setLike = hooks.useSetCommentLike();
  const createComment = hooks.useCreateComment();
  return (
    <Comment.Root comment={comment}>
      {renderActor === undefined ? null : (
        <View>{renderActor(comment.actorId)}</View>
      )}
      <Comment.Body />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Comment.Like
          onToggle={(active) =>
            void setLike({ commentId: comment.id, desiredState: active })
          }
        />
        {comment.body !== null && comment.depth < maxCommentDepth ? (
          <Comment.Reply onActivate={() => setReplying((value) => !value)} />
        ) : null}
        <Comment.RepliesButton
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </View>
      {replying ? (
        <FeedbackForm.Root>
          <FeedbackForm.Textarea
            value={replyBody}
            onChangeText={setReplyBody}
            placeholder={messages.comments.placeholder}
          />
          <FeedbackForm.Submit
            onPress={async () => {
              if (replyBody.trim().length === 0) return;
              await createComment({
                entryId,
                parentCommentId: comment.id,
                body: replyBody,
              });
              setReplyBody("");
              setReplying(false);
              setExpanded(true);
            }}
          >
            {messages.comments.reply}
          </FeedbackForm.Submit>
          <NativeButton
            label={messages.comments.cancelReply}
            onPress={() => setReplying(false)}
          />
        </FeedbackForm.Root>
      ) : null}
      {expanded ? (
        <ReplyList
          hooks={hooks}
          entryId={entryId}
          parentCommentId={comment.id}
          commentSort={commentSort}
          maxCommentDepth={maxCommentDepth}
          transformComments={transformComments}
          renderActor={renderActor}
        />
      ) : null}
      {comment.deletedAt !== undefined ? (
        <Text style={{ color: theme.colors.mutedText, fontSize: 11 }}>
          {messages.comments.deleted}
        </Text>
      ) : null}
    </Comment.Root>
  );
}

function ReplyList({
  hooks,
  entryId,
  parentCommentId,
  commentSort,
  maxCommentDepth,
  transformComments,
  renderActor,
}: FeedbackScreenReplyListProps) {
  const { messages } = useFeedbackUi();
  const replies = hooks.useComments({
    entryId,
    parentCommentId,
    sort: commentSort,
  });
  const visible = useMemo(
    () => transformComments?.(replies.results) ?? replies.results,
    [replies.results, transformComments],
  );
  return (
    <Comment.Children>
      {visible.map((reply) => (
        <CommentBranch
          key={reply.id}
          comment={reply}
          entryId={entryId}
          hooks={hooks}
          commentSort={commentSort}
          maxCommentDepth={maxCommentDepth}
          transformComments={transformComments}
          renderActor={renderActor}
        />
      ))}
      {replies.status === "CanLoadMore" ? (
        <NativeButton
          label={messages.comments.loadMore}
          onPress={() => replies.loadMore(hooks.pageSizes.replies)}
        />
      ) : null}
    </Comment.Children>
  );
}
