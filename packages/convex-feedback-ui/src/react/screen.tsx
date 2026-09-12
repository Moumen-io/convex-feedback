"use client";

import type { EntryKind, FeedbackMetadata } from "convex-feedback";
import { useMemo, useState, type SyntheticEvent } from "react";

import {
  FeedbackBodyProvider,
  useFeedbackBody,
} from "../shared/context/FeedbackBodyProvider.js";
import {
  FeedbackProvider,
  useFeedbackUi,
} from "../shared/context/FeedbackProvider";
import {
  allowAuthenticatedAction,
  createEntryLabel,
  entryStatusChoices,
} from "../shared/helpers.js";
import type {
  FeedbackScreenCommentBranchProps,
  FeedbackScreenContentProps,
  FeedbackScreenEntryCardProps,
  FeedbackScreenEntryDetailProps,
  FeedbackScreenEntryModalProps,
  FeedbackScreenReplyListProps,
  FeedbackScreenRootProps,
} from "../shared/types/";
import {
  Comment,
  ChoiceChips,
  FeedbackBoard,
  FeedbackEntry,
  FeedbackForm,
} from "./primitives.js";
import { FeedbackActionError, useFeedbackAction } from "./action.js";
import { collectWebMetadata } from "./metadata.js";
import { collectEntryMetadata, formatMetadataKey } from "../shared/metadata.js";

const entryKinds: readonly EntryKind[] = [
  "feedback",
  "feature_request",
  "bug_report",
];

export interface FeedbackScreenProps extends FeedbackScreenRootProps {
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
  onUnauthenticated,
  debounceDuration = 300,
  collectMetadata,
  emptyState,
  loading,
  ...props
}: FeedbackScreenProps) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <FeedbackBodyProvider
        hooks={hooks}
        entrySort={entrySort}
        commentSort={commentSort}
        enabledKinds={enabledKinds}
        maxCommentDepth={maxCommentDepth}
        debounceDuration={debounceDuration}
        collectMetadata={collectMetadata}
        emptyState={emptyState}
        loading={loading}
        collectStandardMetadata={collectWebMetadata}
        transformComments={transformComments}
        renderActor={renderActor}
        onUnauthenticated={onUnauthenticated}
      >
        <FeedbackScreenInner {...props} />
      </FeedbackBodyProvider>
    </FeedbackProvider>
  );
}

interface FeedbackScreenInnerProps extends FeedbackScreenContentProps {
  className?: string | undefined;
}

function FeedbackScreenInner({
  className,
  ...colors
}: FeedbackScreenInnerProps) {
  const {
    hooks,
    entrySort,
    enabledKinds,
    showForm,
    setShowForm,
    setSelectedEntryId,
    selectedEntryId,
    statusFilter,
    setStatusFilter,
    query,
    setQuery,
    debouncedQuery,
    emptyState,
    loading: loadingIndicator,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages } = useFeedbackUi();

  const list = hooks.useEntries({
    sort: entrySort,
    kinds: enabledKinds,
    statusFilter,
  });
  const searchResults = hooks.useSearchEntries({
    searchQuery: debouncedQuery,
    kinds: enabledKinds,
    statusFilter,
  });

  if (selectedEntryId !== null) {
    return (
      <FeedbackBoard.Root className={className} {...colors}>
        <EntryDetail
          entryId={selectedEntryId}
          onBack={() => setSelectedEntryId(null)}
        />
      </FeedbackBoard.Root>
    );
  }

  const searching = query.trim().length > 0;
  const entries = searching ? searchResults : list.results;
  const isLoading = searching
    ? searchResults === undefined
    : list.status === "LoadingFirstPage";

  return (
    <FeedbackBoard.Root className={className} {...colors}>
      <FeedbackBoard.Header>
        <div>
          <FeedbackBoard.Title />
          <p className="cf-board__subtitle">{messages.board.subtitle}</p>
          <ChoiceChips
            aria-label={messages.board.statusFilter}
            options={entryStatusChoices(messages)}
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
        </div>
        <button
          type="button"
          className="cf-button cf-button--primary"
          disabled={isAuthenticated === undefined}
          onClick={() => {
            if (!allowAuthenticatedAction(isAuthenticated, onUnauthenticated)) {
              return;
            }
            setShowForm((current) => !current);
          }}
        >
          {showForm
            ? messages.form.cancel
            : createEntryLabel(enabledKinds, messages)}
        </button>
      </FeedbackBoard.Header>

      {showForm && (
        <CreateEntryForm
          onCreated={(entryId) => {
            setShowForm(false);
            setSelectedEntryId(entryId);
          }}
        />
      )}

      <FeedbackBoard.Search value={query} onValueChange={setQuery} />

      {isLoading ? (
        <FeedbackBoard.State>
          {loadingIndicator ?? (
            <span className="cf-state__message">{messages.board.loading}</span>
          )}
        </FeedbackBoard.State>
      ) : entries !== undefined && entries.length === 0 ? (
        <FeedbackBoard.State>
          {emptyState}
          <span className="cf-state__message">
            {searching
              ? messages.board.noSearchResults
              : messages.board.noEntries}
          </span>
          <button
            type="button"
            className="cf-button cf-button--primary"
            disabled={isAuthenticated === undefined}
            onClick={() => {
              if (
                allowAuthenticatedAction(isAuthenticated, onUnauthenticated)
              ) {
                setShowForm(true);
              }
            }}
          >
            {createEntryLabel(enabledKinds, messages)}
          </button>
        </FeedbackBoard.State>
      ) : (
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
      )}

      {!searching && list.status === "CanLoadMore" && (
        <button
          type="button"
          className="cf-button"
          onClick={() => list.loadMore(hooks.pageSizes.entries)}
        >
          {messages.board.loadMore}
        </button>
      )}
    </FeedbackBoard.Root>
  );
}

function EntryCard({ entry, hooks, onOpen }: FeedbackScreenEntryCardProps) {
  const { isAuthenticated, onUnauthenticated } = useFeedbackBody();
  const setUpvote = hooks.useSetEntryUpvote();
  const action = useFeedbackAction();

  const toggleUpvote = (desiredState: boolean) => {
    if (
      !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
      action.pending
    ) {
      return;
    }
    void action.run(() => setUpvote({ entryId: entry.id, desiredState }));
  };

  return (
    <>
      <FeedbackEntry.Root entry={entry}>
        <FeedbackEntry.Upvote
          disabled={isAuthenticated === undefined || action.pending}
          onToggle={toggleUpvote}
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
      <FeedbackActionError failure={action.failure} />
    </>
  );
}

function CreateEntryForm({ onCreated }: FeedbackScreenEntryModalProps) {
  const {
    hooks,
    enabledKinds,
    collectMetadata,
    collectStandardMetadata,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages } = useFeedbackUi();
  const [kind, setKind] = useState<EntryKind>(enabledKinds[0] ?? "feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const createEntry = hooks.useCreateEntry();
  const action = useFeedbackAction();
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
    if (action.pending) return;

    if (!allowAuthenticatedAction(isAuthenticated, onUnauthenticated)) return;

    await action.run(async () => {
      const metadata = await collectEntryMetadata(
        collectMetadata,
        kind,
        collectStandardMetadata,
      );
      const entryId = await createEntry({
        kind,
        title,
        body,
        ...(metadata === undefined ? {} : { metadata }),
      });

      onCreated(entryId);
    });
  };

  const suggestions = useMemo(() => {
    if (similar === undefined) return [];
    return [...similar.exact, ...similar.similar];
  }, [similar]);

  return (
    <FeedbackForm.Root onSubmit={submit}>
      {enabledKinds.length > 1 && (
        <label className="cf-field">
          <span>{messages.form.kind}</span>
          <ChoiceChips
            aria-label={messages.form.kind}
            options={enabledKinds.map((value) => ({
              value,
              label: messages.kinds[value],
            }))}
            value={kind}
            onValueChange={setKind}
          />
        </label>
      )}
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
        submitting={action.pending}
        disabled={
          confirmingDuplicate || action.pending || isAuthenticated === undefined
        }
      />
      <FeedbackActionError failure={action.failure} />
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

function EntryDetail({ entryId, onBack }: FeedbackScreenEntryDetailProps) {
  const {
    hooks,
    commentSort,
    transformComments,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages } = useFeedbackUi();
  const entry = hooks.useEntry(entryId);
  const setUpvote = hooks.useSetEntryUpvote();
  const comments = hooks.useComments({ entryId, sort: commentSort });
  const createComment = hooks.useCreateComment();
  const [body, setBody] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const upvoteAction = useFeedbackAction();
  const commentAction = useFeedbackAction();

  const toggleUpvote = (desiredState: boolean) => {
    if (
      !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
      upvoteAction.pending
    ) {
      return;
    }
    void upvoteAction.run(() => setUpvote({ entryId, desiredState }));
  };

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
          disabled={isAuthenticated === undefined || upvoteAction.pending}
          onToggle={toggleUpvote}
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
      <FeedbackActionError failure={upvoteAction.failure} />

      {entry.metadata !== undefined && (
        <div>
          <button
            type="button"
            className="cf-button"
            onClick={() => setShowMetadata(true)}
          >
            {messages.metadata.view}
          </button>
        </div>
      )}

      {showMetadata && entry.metadata !== undefined && (
        <MetadataDialog
          metadata={entry.metadata}
          onClose={() => setShowMetadata(false)}
        />
      )}

      <section className="cf-discussion">
        <h3>{messages.comments.title}</h3>
        <FeedbackForm.Root
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim().length === 0) return;
            if (
              !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
              commentAction.pending
            ) {
              return;
            }
            void commentAction.run(async () => {
              await createComment({ entryId, body });
              setBody("");
            });
          }}
        >
          <FeedbackForm.Textarea
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            placeholder={messages.comments.placeholder}
            rows={3}
          />
          <button
            type="submit"
            className="cf-button cf-button--primary"
            disabled={isAuthenticated === undefined || commentAction.pending}
          >
            {messages.comments.submit}
          </button>
        </FeedbackForm.Root>
        <FeedbackActionError failure={commentAction.failure} />

        {comments.status === "LoadingFirstPage" && (
          <p className="cf-state">{messages.board.loading}</p>
        )}
        {comments.status !== "LoadingFirstPage" &&
          visibleComments.length === 0 && (
            <p className="cf-state">{messages.comments.noComments}</p>
          )}
        <div className="cf-comments">
          {visibleComments.map((comment) => (
            <CommentBranch
              key={comment.id}
              comment={comment}
              entryId={entryId}
            />
          ))}
        </div>
        {(comments.status === "CanLoadMore" ||
          comments.status === "LoadingMore") && (
          <button
            type="button"
            className="cf-button"
            disabled={comments.status === "LoadingMore"}
            onClick={() => comments.loadMore(hooks.pageSizes.comments)}
          >
            {messages.comments.loadMore}
          </button>
        )}
      </section>
    </div>
  );
}

function MetadataDialog({
  metadata,
  onClose,
}: {
  metadata: FeedbackMetadata;
  onClose: () => void;
}) {
  const { messages } = useFeedbackUi();
  const sections = [
    [messages.metadata.standard, metadata.standard],
    [messages.metadata.additional, metadata.additional],
  ] as const;
  const hasValues = sections.some(
    ([, values]) => values !== undefined && Object.keys(values).length > 0,
  );

  return (
    <div className="cf-confirm-backdrop" onMouseDown={onClose}>
      <div
        className="cf-confirm cf-metadata-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-metadata-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3 id="cf-metadata-title">{messages.metadata.title}</h3>
        {hasValues ? (
          sections.map(([label, values]) =>
            values === undefined || Object.keys(values).length === 0 ? null : (
              <section key={label} className="cf-metadata-section">
                <h4>{label}</h4>
                <dl>
                  {Object.entries(values).map(([key, value]) => (
                    <div key={key} className="cf-metadata-row">
                      <dt>{formatMetadataKey(key)}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ),
          )
        ) : (
          <p>{messages.metadata.empty}</p>
        )}
        <div className="cf-inline-actions">
          <button type="button" className="cf-button" onClick={onClose}>
            {messages.metadata.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentBranch({ comment, entryId }: FeedbackScreenCommentBranchProps) {
  const {
    hooks,
    maxCommentDepth,
    renderActor,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages } = useFeedbackUi();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const setLike = hooks.useSetCommentLike();
  const createComment = hooks.useCreateComment();
  const likeAction = useFeedbackAction();
  const replyAction = useFeedbackAction();

  const toggleLike = (desiredState: boolean) => {
    if (
      !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
      likeAction.pending
    ) {
      return;
    }
    void likeAction.run(() => setLike({ commentId: comment.id, desiredState }));
  };

  return (
    <Comment.Root comment={comment}>
      {renderActor === undefined ? null : (
        <div className="cf-comment__author">{renderActor(comment.actorId)}</div>
      )}
      <Comment.Body />
      <div className="cf-comment__toolbar">
        <Comment.Like
          disabled={isAuthenticated === undefined || likeAction.pending}
          onToggle={toggleLike}
        />
        {comment.body !== null && comment.depth < maxCommentDepth && (
          <Comment.Reply
            disabled={isAuthenticated === undefined || replyAction.pending}
            onActivate={() => {
              if (
                allowAuthenticatedAction(isAuthenticated, onUnauthenticated)
              ) {
                setReplying((value) => !value);
              }
            }}
          />
        )}
        <Comment.RepliesButton
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>
      <FeedbackActionError failure={likeAction.failure} />
      {replying && (
        <FeedbackForm.Root
          onSubmit={(event) => {
            event.preventDefault();
            if (replyBody.trim().length === 0) return;
            if (
              !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
              replyAction.pending
            ) {
              return;
            }
            void replyAction.run(async () => {
              await createComment({
                entryId,
                parentCommentId: comment.id,
                body: replyBody,
              });
              setReplyBody("");
              setReplying(false);
              setExpanded(true);
            });
          }}
        >
          <FeedbackForm.Textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.currentTarget.value)}
            placeholder={messages.comments.placeholder}
            rows={2}
          />
          <div className="cf-inline-actions">
            <button
              type="submit"
              className="cf-button cf-button--primary"
              disabled={isAuthenticated === undefined || replyAction.pending}
            >
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
      )}
      <FeedbackActionError failure={replyAction.failure} />
      {expanded && <ReplyList entryId={entryId} parentCommentId={comment.id} />}
    </Comment.Root>
  );
}

function ReplyList({ entryId, parentCommentId }: FeedbackScreenReplyListProps) {
  const { hooks, commentSort, transformComments } = useFeedbackBody();
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
      {replies.status === "LoadingFirstPage" && (
        <p className="cf-state">{messages.board.loading}</p>
      )}
      {visibleReplies.map((reply) => (
        <CommentBranch key={reply.id} comment={reply} entryId={entryId} />
      ))}
      {(replies.status === "CanLoadMore" ||
        replies.status === "LoadingMore") && (
        <button
          type="button"
          className="cf-button"
          disabled={replies.status === "LoadingMore"}
          onClick={() => replies.loadMore(hooks.pageSizes.replies)}
        >
          {messages.comments.loadMore}
        </button>
      )}
    </Comment.Children>
  );
}
