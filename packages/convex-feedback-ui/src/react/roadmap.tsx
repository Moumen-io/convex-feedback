"use client";

import type { RoadmapItem } from "convex-feedback";
import { useState } from "react";

import {
  FeedbackProvider,
  useFeedbackUi,
} from "../shared/context/FeedbackProvider.js";
import { allowAuthenticatedAction } from "../shared/helpers.js";
import type { RoadmapScreenProps } from "../shared/types/index.js";
import { FeedbackActionError, useFeedbackAction } from "./action.js";
import { FeedbackBoard, FeedbackEntry } from "./primitives.js";

export function RoadmapScreen({
  hooks,
  messages,
  theme,
  unstyled,
  onEntryOpen,
  onUnauthenticated,
  pageSize,
  entryPageSize,
  ...colors
}: RoadmapScreenProps) {
  const resolvedPageSize = pageSize ?? hooks.pageSizes.roadmap;
  const resolvedEntryPageSize = entryPageSize ?? hooks.pageSizes.entries;
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <RoadmapScreenInner
        hooks={hooks}
        onEntryOpen={onEntryOpen}
        onUnauthenticated={onUnauthenticated}
        pageSize={resolvedPageSize}
        entryPageSize={resolvedEntryPageSize}
        {...colors}
      />
    </FeedbackProvider>
  );
}

function RoadmapScreenInner({
  hooks,
  onEntryOpen,
  onUnauthenticated,
  pageSize,
  entryPageSize,
  ...colors
}: Omit<RoadmapScreenProps, "pageSize" | "entryPageSize"> & {
  pageSize: number;
  entryPageSize: number;
}) {
  const { messages } = useFeedbackUi();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roadmap = hooks.useRoadmap();
  const search = hooks.useSearchRoadmap(query);
  const searching = query.trim().length > 0;
  const items = searching ? (search ?? []) : roadmap.results;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (selected !== null) {
    return (
      <FeedbackBoard.Root {...colors}>
        <RoadmapDetail
          item={selected}
          hooks={hooks}
          entryPageSize={entryPageSize}
          onEntryOpen={onEntryOpen}
          onUnauthenticated={onUnauthenticated}
          onBack={() => setSelectedId(null)}
        />
      </FeedbackBoard.Root>
    );
  }

  const loading = searching
    ? search === undefined
    : roadmap.status === "LoadingFirstPage";

  return (
    <FeedbackBoard.Root {...colors}>
      <FeedbackBoard.Header>
        <div>
          <FeedbackBoard.Title>Roadmap</FeedbackBoard.Title>
          <p className="cf-board__subtitle">
            See what is planned, in progress, and shipped.
          </p>
        </div>
      </FeedbackBoard.Header>
      <FeedbackBoard.Search
        value={query}
        onValueChange={setQuery}
        placeholder="Search roadmap…"
      />
      {loading ? (
        <FeedbackBoard.State>{messages.board.loading}</FeedbackBoard.State>
      ) : items.length === 0 ? (
        <FeedbackBoard.State>
          {searching ? "No roadmap items found." : "No roadmap items yet."}
        </FeedbackBoard.State>
      ) : (
        <FeedbackBoard.List>
          {items.map((item) => (
            <RoadmapCard
              key={item.id}
              item={item}
              onOpen={() => setSelectedId(item.id)}
            />
          ))}
        </FeedbackBoard.List>
      )}
      {!searching &&
        (roadmap.status === "CanLoadMore" ||
          roadmap.status === "LoadingMore") && (
          <button
            type="button"
            className="cf-button"
            disabled={roadmap.status === "LoadingMore"}
            onClick={() => roadmap.loadMore(pageSize)}
          >
            {messages.board.loadMore}
          </button>
        )}
    </FeedbackBoard.Root>
  );
}

function RoadmapCard({
  item,
  onOpen,
}: {
  item: RoadmapItem;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="cf-entry cf-roadmap-card" onClick={onOpen}>
      <span className="cf-entry__content">
        <span className="cf-entry__meta">
          <span className="cf-entry__kind">
            {item.status.replaceAll("_", " ")}
          </span>
          <span className="cf-status">{item.feedbackCount} linked</span>
        </span>
        <strong className="cf-entry__title">{item.title}</strong>
        {item.description && (
          <span className="cf-entry__body">{item.description}</span>
        )}
      </span>
    </button>
  );
}

function RoadmapDetail({
  item,
  hooks,
  entryPageSize,
  onEntryOpen,
  onUnauthenticated,
  onBack,
}: {
  item: RoadmapItem;
  hooks: RoadmapScreenProps["hooks"];
  entryPageSize: number;
  onEntryOpen: RoadmapScreenProps["onEntryOpen"];
  onUnauthenticated: RoadmapScreenProps["onUnauthenticated"];
  onBack: () => void;
}) {
  const { messages } = useFeedbackUi();
  const feedback = hooks.useRoadmapFeedback(item.id);
  return (
    <div className="cf-detail">
      <button
        type="button"
        className="cf-button cf-button--link"
        onClick={onBack}
      >
        {messages.entry.back}
      </button>
      <header>
        <div className="cf-entry__meta">
          <span className="cf-entry__kind">
            {item.status.replaceAll("_", " ")}
          </span>
          <span className="cf-status">Position {item.position}</span>
        </div>
        <h2 className="cf-board__title">{item.title}</h2>
        <p className="cf-entry__body">
          {item.description ?? "No description."}
        </p>
      </header>
      <dl className="cf-roadmap-meta">
        <div>
          <dt>ID</dt>
          <dd>{item.id}</dd>
        </div>
        <div>
          <dt>Linked feedback</dt>
          <dd>{item.feedbackCount}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(item.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{new Date(item.updatedAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Document created</dt>
          <dd>{new Date(item.creationTime).toLocaleString()}</dd>
        </div>
      </dl>
      <section className="cf-discussion">
        <h3>Attached feedback</h3>
        {feedback.status === "LoadingFirstPage" ? (
          <p className="cf-state">{messages.board.loading}</p>
        ) : feedback.results.length === 0 ? (
          <p className="cf-state">No feedback attached.</p>
        ) : (
          <div className="cf-comments">
            {feedback.results.map((entry) => (
              <RoadmapEntry
                key={entry.id}
                entry={entry}
                hooks={hooks}
                onOpen={onEntryOpen}
                onUnauthenticated={onUnauthenticated}
              />
            ))}
          </div>
        )}
        {(feedback.status === "CanLoadMore" ||
          feedback.status === "LoadingMore") && (
          <button
            type="button"
            className="cf-button"
            disabled={feedback.status === "LoadingMore"}
            onClick={() => feedback.loadMore(entryPageSize)}
          >
            {messages.comments.loadMore}
          </button>
        )}
      </section>
    </div>
  );
}

function RoadmapEntry({
  entry,
  hooks,
  onOpen,
  onUnauthenticated,
}: {
  entry: Parameters<typeof FeedbackEntry.Root>[0]["entry"];
  hooks: RoadmapScreenProps["hooks"];
  onOpen: RoadmapScreenProps["onEntryOpen"];
  onUnauthenticated: RoadmapScreenProps["onUnauthenticated"];
}) {
  const isAuthenticated = hooks.useIsAuthenticated();
  const setUpvote = hooks.useSetEntryUpvote();
  const action = useFeedbackAction();
  const toggle = (desiredState: boolean) => {
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
          onToggle={toggle}
        />
        <FeedbackEntry.Content
          onClick={() => onOpen?.(entry.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen?.(entry.id);
            }
          }}
          role={onOpen === undefined ? undefined : "button"}
          tabIndex={onOpen === undefined ? undefined : 0}
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
