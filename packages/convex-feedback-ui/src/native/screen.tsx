import type {
  CommentSort,
  EntryKind,
  EntrySort,
  FeedbackComment,
  FeedbackEntry as FeedbackEntryData,
} from "convex-feedback";
import type { FeedbackHooks } from "convex-feedback/react";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import type { FeedbackMessageOverrides } from "../shared/messages.js";
import type { FeedbackThemeOverride } from "../shared/theme.js";
import {
  FeedbackProvider,
  useFeedbackUi,
  type FeedbackNativeColorProps,
} from "./context.js";
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

export interface FeedbackScreenProps extends FeedbackNativeColorProps {
  hooks: FeedbackHooks;
  messages?: FeedbackMessageOverrides | undefined;
  theme?: FeedbackThemeOverride | undefined;
  unstyled?: boolean | undefined;
  entrySort?: EntrySort | undefined;
  commentSort?: CommentSort | undefined;
  enabledKinds?: readonly EntryKind[] | undefined;
  maxCommentDepth?: number | undefined;
  transformComments?: (
    comments: readonly FeedbackComment[],
  ) => readonly FeedbackComment[];
  renderActor?: (actorId: string) => ReactNode;
}

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
}: FeedbackScreenProps) {
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
}: FeedbackNativeColorProps & {
  hooks: FeedbackHooks;
  entrySort: EntrySort;
  commentSort: CommentSort;
  enabledKinds: readonly EntryKind[];
  maxCommentDepth: number;
  transformComments?: FeedbackScreenProps["transformComments"];
  renderActor?: FeedbackScreenProps["renderActor"];
}) {
  const { messages, theme } = useFeedbackUi();
  const [query, setQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const list = hooks.useEntries({ sort: entrySort });
  const search = hooks.useSearchEntries({ searchQuery: query });

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
    <FeedbackBoard.Root {...colors}>
      <FeedbackBoard.Header>
        <FeedbackBoard.Title />
        <Text style={{ color: theme.colors.mutedText }}>
          {messages.board.subtitle}
        </Text>
        <Pressable
          onPress={() => setShowForm((value) => !value)}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderRadius: 9,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>
            {showForm ? messages.form.cancel : messages.board.createEntry}
          </Text>
        </Pressable>
      </FeedbackBoard.Header>
      {showForm ? (
        <CreateForm
          hooks={hooks}
          enabledKinds={enabledKinds}
          onCreated={(id) => {
            setShowForm(false);
            setSelectedEntryId(id);
          }}
        />
      ) : null}
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

function EntryCard({
  entry,
  hooks,
  onOpen,
}: {
  entry: FeedbackEntryData;
  hooks: FeedbackHooks;
  onOpen: () => void;
}) {
  const setUpvote = hooks.useSetEntryUpvote();
  return (
    <FeedbackEntry.Root entry={entry}>
      <FeedbackEntry.Upvote
        onToggle={(active) =>
          void setUpvote({ entryId: entry.id, desiredState: active })
        }
      />
      <Pressable onPress={onOpen} style={{ flex: 1, gap: 4 }}>
        <FeedbackEntry.Status />
        <FeedbackEntry.Title />
        <FeedbackEntry.Body numberOfLines={3} />
        <FeedbackEntry.CommentCount />
      </Pressable>
    </FeedbackEntry.Root>
  );
}

function CreateForm({
  hooks,
  enabledKinds,
  onCreated,
}: {
  hooks: FeedbackHooks;
  enabledKinds: readonly EntryKind[];
  onCreated: (id: string) => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const [kind, setKind] = useState<EntryKind>(enabledKinds[0] ?? "feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const create = hooks.useCreateEntry();
  const similar = hooks.useSimilarEntries({ title, body, kind });

  return (
    <FeedbackForm.Root
      style={{
        padding: 12,
        borderRadius: theme.radius,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
        {messages.form.kind}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {enabledKinds.map((value) => (
          <Pressable
            key={value}
            onPress={() => setKind(value)}
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
        onChangeText={setTitle}
        placeholder={messages.form.titlePlaceholder}
      />
      <FeedbackForm.Textarea
        value={body}
        onChangeText={setBody}
        placeholder={messages.form.bodyPlaceholder}
      />
      {similar !== undefined &&
        similar.exact.length + similar.similar.length > 0 && (
          <Text style={{ color: theme.colors.mutedText }}>
            {similar.exact.length > 0
              ? messages.form.exactDuplicate
              : messages.form.possibleDuplicates}
          </Text>
        )}
      <FeedbackForm.Submit
        submitting={submitting}
        onPress={async () => {
          if (title.trim().length === 0 || body.trim().length === 0) return;
          setSubmitting(true);
          try {
            onCreated(await create({ kind, title, body }));
          } finally {
            setSubmitting(false);
          }
        }}
      />
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
}: {
  hooks: FeedbackHooks;
  entryId: string;
  onBack: () => void;
  commentSort: CommentSort;
  maxCommentDepth: number;
  transformComments?: FeedbackScreenProps["transformComments"];
  renderActor?: FeedbackScreenProps["renderActor"];
}) {
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
      <Text style={{ color: theme.colors.mutedText }}>
        {messages.board.loading}
      </Text>
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
            sort={commentSort}
            maxDepth={maxCommentDepth}
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
  sort,
  maxDepth,
  transformComments,
  renderActor,
}: {
  comment: FeedbackComment;
  entryId: string;
  hooks: FeedbackHooks;
  sort: CommentSort;
  maxDepth: number;
  transformComments?: FeedbackScreenProps["transformComments"];
  renderActor?: FeedbackScreenProps["renderActor"];
}) {
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
        {comment.body !== null && comment.depth < maxDepth ? (
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
          sort={sort}
          maxDepth={maxDepth}
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
  sort,
  maxDepth,
  transformComments,
  renderActor,
}: {
  hooks: FeedbackHooks;
  entryId: string;
  parentCommentId: string;
  sort: CommentSort;
  maxDepth: number;
  transformComments?: FeedbackScreenProps["transformComments"];
  renderActor?: FeedbackScreenProps["renderActor"];
}) {
  const { messages } = useFeedbackUi();
  const replies = hooks.useComments({ entryId, parentCommentId, sort });
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
          sort={sort}
          maxDepth={maxDepth}
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
