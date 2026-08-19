"use client";

import type { CommentSort, EntryKind, EntrySort } from "convex-feedback";
import type { FeedbackHooks } from "convex-feedback/react";
import { useMemo, useState, type SyntheticEvent } from "react";

import type {
  FeedbackColorProps,
  FeedbackScreenCommentBranchProps,
  FeedbackScreenEntryCardProps,
  FeedbackScreenEntryDetailProps,
  FeedbackScreenEntryModalProps,
  FeedbackScreenReplyListProps,
  FeedbackScreenRootProps,
} from "../shared/types/";
import { FeedbackProvider, useFeedbackUi } from "./context.js";
import {
  Comment,
  FeedbackBoard,
  FeedbackEntry,
  FeedbackForm,
} from "./primitives.js";

const entryKinds: readonly EntryKind[] = [
  "feedback",
  "feature_request",
  "bug_report",
];

export interface FeedbackScreenProps
  extends FeedbackColorProps, FeedbackScreenRootProps {
  className?: string | undefined;
}

export function FeedbackScreen({
  hooks,
  messages,
  theme,
  unstyled,
  entrySort = "top",
  commentSort = "top",
  enabledKinds = entryKinds,
  maxCommentDepth = 5,
  transformComments,
  renderActor,
  className,
  ...colors
}: FeedbackScreenProps) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <FeedbackScreenInner
        hooks={hooks}
        entrySort={entrySort}
        commentSort={commentSort}
        enabledKinds={enabledKinds}
        maxCommentDepth={maxCommentDepth}
        transformComments={transformComments}
        renderActor={renderActor}
        className={className}
        {...colors}
      />
    </FeedbackProvider>
  );
}

interface FeedbackScreenInnerProps extends FeedbackColorProps {
  hooks: FeedbackHooks;
  entrySort: EntrySort;
  commentSort: CommentSort;
  enabledKinds: readonly EntryKind[];
  maxCommentDepth: number;
  transformComments?: FeedbackScreenProps["transformComments"];
  renderActor?: FeedbackScreenProps["renderActor"];
  className?: string | undefined;
}

function FeedbackScreenInner({
  hooks,
  entrySort,
  commentSort,
  enabledKinds,
  maxCommentDepth,
  transformComments,
  renderActor,
  className,
  ...colors
}: FeedbackScreenInnerProps) {
  const { messages } = useFeedbackUi();
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const list = hooks.useEntries({ sort: entrySort, kinds: enabledKinds });
  const searchResults = hooks.useSearchEntries({
    searchQuery,
    kinds: enabledKinds,
  });

  if (selectedEntryId !== null) {
    return (
      <FeedbackBoard.Root className={className} {...colors}>
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

  const searching = searchQuery.trim().length > 0;
  const entries = searching ? searchResults : list.results;
  const loading = searching
    ? searchResults === undefined
    : list.status === "LoadingFirstPage";

  return (
    <FeedbackBoard.Root className={className} {...colors}>
      <FeedbackBoard.Header>
        <div>
          <FeedbackBoard.Title />
          <p className="cf-board__subtitle">{messages.board.subtitle}</p>
        </div>
        <button
          type="button"
          className="cf-button cf-button--primary"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? messages.form.cancel : messages.board.createEntry}
        </button>
      </FeedbackBoard.Header>

      {showForm ? (
        <CreateEntryForm
          hooks={hooks}
          enabledKinds={enabledKinds}
          onCreated={(entryId) => {
            setShowForm(false);
            setSelectedEntryId(entryId);
          }}
        />
      ) : null}

      <FeedbackBoard.Search
        value={searchQuery}
        onValueChange={setSearchQuery}
      />

      {loading ? <p className="cf-state">{messages.board.loading}</p> : null}
      {!loading && entries !== undefined && entries.length === 0 ? (
        <p className="cf-state">
          {searching
            ? messages.board.noSearchResults
            : messages.board.noEntries}
        </p>
      ) : null}

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
        <button
          type="button"
          className="cf-button"
          onClick={() => list.loadMore(hooks.pageSizes.entries)}
        >
          {messages.board.loadMore}
        </button>
      ) : null}
    </FeedbackBoard.Root>
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
      <FeedbackEntry.Content
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="cf-entry__meta">
          <FeedbackEntry.Kind />
          <FeedbackEntry.Status />
          <FeedbackEntry.CommentCount />
        </div>
        <FeedbackEntry.Title />
        <FeedbackEntry.Body />
      </FeedbackEntry.Content>
    </FeedbackEntry.Root>
  );
}

function CreateEntryForm({
  hooks,
  enabledKinds,
  onCreated,
}: FeedbackScreenEntryModalProps) {
  const { messages } = useFeedbackUi();
  const [kind, setKind] = useState<EntryKind>(enabledKinds[0] ?? "feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const createEntry = hooks.useCreateEntry();
  const similar = hooks.useSimilarEntries({ title, body, kind });
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      similar === undefined ||
      title.trim().length === 0 ||
      body.trim().length === 0
    ) {
      return;
    }

    if (suggestions.length > 0) {
      setConfirmingDuplicate(true);
      return;
    }

    void create();
  };

  const create = async () => {
    if (submitting) return;

    setSubmitting(true);

    try {
      const entryId = await createEntry({
        kind,
        title,
        body,
      });

      onCreated(entryId);
    } finally {
      setSubmitting(false);
    }
  };

  const suggestions = useMemo(() => {
    if (similar === undefined) return [];
    return [...similar.exact, ...similar.similar];
  }, [similar]);

  return (
    <FeedbackForm.Root onSubmit={submit}>
      <label className="cf-field">
        <span>{messages.form.kind}</span>
        <FeedbackForm.Select
          value={kind}
          onChange={(event) => setKind(event.currentTarget.value as EntryKind)}
        >
          {enabledKinds.map((value) => (
            <option key={value} value={value}>
              {messages.kinds[value]}
            </option>
          ))}
        </FeedbackForm.Select>
      </label>
      <label className="cf-field">
        <span>{messages.form.title}</span>
        <FeedbackForm.Input
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder={messages.form.titlePlaceholder}
          required
        />
      </label>
      <label className="cf-field">
        <span>{messages.form.body}</span>
        <FeedbackForm.Textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          placeholder={messages.form.bodyPlaceholder}
          rows={5}
          required
        />
      </label>
      {suggestions.length > 0 && (
        <aside className="cf-duplicates">
          <strong>
            {similar?.exact.length
              ? messages.form.exactDuplicate
              : messages.form.possibleDuplicates}
          </strong>

          <div className="cf-duplicates__list">
            {suggestions.map((entry) => (
              <div key={entry.id} className="cf-duplicate">
                <div className="cf-entry__meta">
                  <span className="cf-entry__kind">
                    {messages.kinds[entry.kind]}
                  </span>

                  <span className="cf-status">
                    {messages.statuses[entry.status]}
                  </span>
                </div>

                <strong>{entry.title}</strong>

                <span className="cf-duplicate__body">{entry.body}</span>

                <span className="cf-duplicate__meta">
                  ▲ {entry.upvoteCount} ·{" "}
                  {messages.entry.comments(entry.commentCount)}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}
      <FeedbackForm.Submit
        submitting={submitting}
        disabled={confirmingDuplicate || submitting}
      />
      {confirmingDuplicate && (
        <div className="cf-confirm-backdrop">
          <div
            className="cf-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cf-duplicate-confirm-title"
          >
            <strong id="cf-duplicate-confirm-title">
              {similar?.exact.length
                ? messages.form.exactDuplicate
                : messages.form.possibleDuplicates}
            </strong>

            <p>{messages.form.duplicateWarning}</p>

            <div className="cf-inline-actions">
              <button
                type="button"
                className="cf-button"
                onClick={() => setConfirmingDuplicate(false)}
              >
                {messages.form.cancel}
              </button>

              <button
                type="button"
                className="cf-button cf-button--primary"
                onClick={() => {
                  setConfirmingDuplicate(false);
                  void create();
                }}
              >
                {messages.form.submitAnyway}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const { messages } = useFeedbackUi();
  const entry = hooks.useEntry(entryId);
  const setUpvote = hooks.useSetEntryUpvote();
  const comments = hooks.useComments({ entryId, sort: commentSort });
  const createComment = hooks.useCreateComment();
  const [body, setBody] = useState("");

  const visibleComments = useMemo(
    () => transformComments?.(comments.results) ?? comments.results,
    [comments.results, transformComments],
  );

  if (entry === undefined)
    return <p className="cf-state">{messages.board.loading}</p>;
  if (entry === null)
    return (
      <button type="button" className="cf-button" onClick={onBack}>
        {messages.entry.back}
      </button>
    );

  return (
    <div className="cf-detail">
      <button
        type="button"
        className="cf-button cf-button--link"
        onClick={onBack}
      >
        {messages.entry.back}
      </button>
      <FeedbackEntry.Root entry={entry}>
        <FeedbackEntry.Upvote
          onToggle={(active) =>
            void setUpvote({ entryId, desiredState: active })
          }
        />
        <FeedbackEntry.Content>
          <div className="cf-entry__meta">
            <FeedbackEntry.Status />
            <FeedbackEntry.CommentCount />
          </div>
          <FeedbackEntry.Title />
          <FeedbackEntry.Body />
        </FeedbackEntry.Content>
      </FeedbackEntry.Root>

      <section className="cf-discussion">
        <h3>{messages.comments.title}</h3>
        <FeedbackForm.Root
          onSubmit={async (event) => {
            event.preventDefault();
            if (body.trim().length === 0) return;
            await createComment({ entryId, body });
            setBody("");
          }}
        >
          <FeedbackForm.Textarea
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            placeholder={messages.comments.placeholder}
            rows={3}
          />
          <button type="submit" className="cf-button cf-button--primary">
            {messages.comments.submit}
          </button>
        </FeedbackForm.Root>

        {comments.status === "LoadingFirstPage" ? (
          <p className="cf-state">{messages.board.loading}</p>
        ) : null}
        {comments.status !== "LoadingFirstPage" &&
        visibleComments.length === 0 ? (
          <p className="cf-state">{messages.comments.noComments}</p>
        ) : null}
        <div className="cf-comments">
          {visibleComments.map((comment) => (
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
        </div>
        {comments.status === "CanLoadMore" ? (
          <button
            type="button"
            className="cf-button"
            onClick={() => comments.loadMore(hooks.pageSizes.comments)}
          >
            {messages.comments.loadMore}
          </button>
        ) : null}
      </section>
    </div>
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
  const { messages } = useFeedbackUi();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const setLike = hooks.useSetCommentLike();
  const createComment = hooks.useCreateComment();

  return (
    <Comment.Root comment={comment}>
      {renderActor === undefined ? null : (
        <div className="cf-comment__author">{renderActor(comment.actorId)}</div>
      )}
      <Comment.Body />
      <div className="cf-comment__toolbar">
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
      </div>
      {replying ? (
        <FeedbackForm.Root
          onSubmit={async (event) => {
            event.preventDefault();
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
          <FeedbackForm.Textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.currentTarget.value)}
            placeholder={messages.comments.placeholder}
            rows={2}
          />
          <div className="cf-inline-actions">
            <button type="submit" className="cf-button cf-button--primary">
              {messages.comments.reply}
            </button>
            <button
              type="button"
              className="cf-button"
              onClick={() => setReplying(false)}
            >
              {messages.comments.cancelReply}
            </button>
          </div>
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
  const visibleReplies = useMemo(
    () => transformComments?.(replies.results) ?? replies.results,
    [replies.results, transformComments],
  );

  return (
    <Comment.Children>
      {replies.status === "LoadingFirstPage" ? (
        <p className="cf-state">{messages.board.loading}</p>
      ) : null}
      {visibleReplies.map((reply) => (
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
        <button
          type="button"
          className="cf-button"
          onClick={() => replies.loadMore(hooks.pageSizes.replies)}
        >
          {messages.comments.loadMore}
        </button>
      ) : null}
    </Comment.Children>
  );
}
