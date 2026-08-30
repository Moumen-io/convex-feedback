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
  FeedbackBoard,
  FeedbackEntry,
  FeedbackForm,
} from "./primitives.js";
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
  debounceDuration = 300,
  collectMetadata,
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
        collectStandardMetadata={collectWebMetadata}
        transformComments={transformComments}
        renderActor={renderActor}
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
    query,
    setQuery,
    debouncedQuery,
  } = useFeedbackBody();
  const { messages } = useFeedbackUi();

  const list = hooks.useEntries({ sort: entrySort, kinds: enabledKinds });
  const searchResults = hooks.useSearchEntries({
    searchQuery: debouncedQuery,
    kinds: enabledKinds,
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

      {showForm && (
        <CreateEntryForm
          onCreated={(entryId) => {
            setShowForm(false);
            setSelectedEntryId(entryId);
          }}
        />
      )}

      <FeedbackBoard.Search value={query} onValueChange={setQuery} />

      {loading && <p className="cf-state">{messages.board.loading}</p>}
      {!loading && entries !== undefined && entries.length === 0 && (
        <p className="cf-state">
          {searching
            ? messages.board.noSearchResults
            : messages.board.noEntries}
        </p>
      )}

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

function CreateEntryForm({ onCreated }: FeedbackScreenEntryModalProps) {
  const { hooks, enabledKinds, collectMetadata, collectStandardMetadata } =
    useFeedbackBody();
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

function EntryDetail({ entryId, onBack }: FeedbackScreenEntryDetailProps) {
  const { hooks, commentSort, transformComments } = useFeedbackBody();
  const { messages } = useFeedbackUi();
  const entry = hooks.useEntry(entryId);
  const setUpvote = hooks.useSetEntryUpvote();
  const comments = hooks.useComments({ entryId, sort: commentSort });
  const createComment = hooks.useCreateComment();
  const [body, setBody] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);

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
        {comments.status === "CanLoadMore" && (
          <button
            type="button"
            className="cf-button"
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
  const { hooks, maxCommentDepth, renderActor } = useFeedbackBody();
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
        {comment.body !== null && comment.depth < maxCommentDepth && (
          <Comment.Reply onActivate={() => setReplying((value) => !value)} />
        )}
        <Comment.RepliesButton
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>
      {replying && (
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
      )}
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
      {replies.status === "CanLoadMore" && (
        <button
          type="button"
          className="cf-button"
          onClick={() => replies.loadMore(hooks.pageSizes.replies)}
        >
          {messages.comments.loadMore}
        </button>
      )}
    </Comment.Children>
  );
}
