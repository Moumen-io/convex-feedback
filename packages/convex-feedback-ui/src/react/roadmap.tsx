"use client";

import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import { useState } from "react";

import {
  FeedbackProvider,
  useFeedbackUi,
} from "../shared/context/FeedbackProvider.js";
import { allowAuthenticatedAction } from "../shared/helpers.js";
import type { RoadmapScreenProps } from "../shared/types/index.js";
import { FeedbackActionError, useFeedbackAction } from "./action.js";
import { FeedbackBoard, FeedbackEntry } from "./primitives.js";

const stages: readonly { value: RoadmapStatus }[] = [
  { value: "planned" },
  { value: "in_progress" },
  { value: "shipped" },
];

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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roadmap = hooks.useRoadmap();
  const search = hooks.useSearchRoadmap(query);
  const searching = query.trim().length > 0;
  const items = searching ? (search ?? []) : roadmap.results;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <FeedbackBoard.Root {...colors}>
      {selected === null ? (
        <RoadmapBoard
          items={items}
          loading={
            searching
              ? search === undefined
              : roadmap.status === "LoadingFirstPage"
          }
          searching={searching}
          query={query}
          onQueryChange={setQuery}
          onItemOpen={(item) => setSelectedId(item.id)}
          canLoadMore={
            !searching &&
            (roadmap.status === "CanLoadMore" ||
              roadmap.status === "LoadingMore")
          }
          loadingMore={roadmap.status === "LoadingMore"}
          onLoadMore={() => roadmap.loadMore(pageSize)}
        />
      ) : (
        <RoadmapDetail
          item={selected}
          hooks={hooks}
          entryPageSize={entryPageSize}
          onEntryOpen={onEntryOpen}
          onUnauthenticated={onUnauthenticated}
          onBack={() => setSelectedId(null)}
        />
      )}
    </FeedbackBoard.Root>
  );
}

function RoadmapBoard({
  items,
  loading,
  searching,
  query,
  onQueryChange,
  onItemOpen,
  canLoadMore,
  loadingMore,
  onLoadMore,
}: {
  items: readonly RoadmapItem[];
  loading: boolean;
  searching: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onItemOpen: (item: RoadmapItem) => void;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const { messages } = useFeedbackUi();

  return (
    <>
      <FeedbackBoard.Header>
        <div>
          <FeedbackBoard.Title>{messages.roadmap.title}</FeedbackBoard.Title>
          <p className="cf-board__subtitle">{messages.roadmap.subtitle}</p>
        </div>
      </FeedbackBoard.Header>
      <FeedbackBoard.Search
        value={query}
        onValueChange={onQueryChange}
        placeholder={messages.roadmap.searchPlaceholder}
      />
      {loading ? (
        <FeedbackBoard.State>{messages.board.loading}</FeedbackBoard.State>
      ) : items.length === 0 ? (
        <FeedbackBoard.State>
          {searching
            ? messages.roadmap.noSearchResults
            : messages.roadmap.noItems}
        </FeedbackBoard.State>
      ) : (
        <div className="cf-roadmap-board">
          {stages.map((stage) => {
            const stageItems = items
              .filter((item) => item.status === stage.value)
              .sort((a, b) => a.position - b.position);

            return (
              <section className="cf-roadmap-column" key={stage.value}>
                <header className="cf-roadmap-column__header">
                  <div className="cf-roadmap-column__heading">
                    <span
                      className="cf-roadmap-status__dot"
                      aria-hidden="true"
                    />
                    <h3>{messages.roadmap.statuses[stage.value]}</h3>
                  </div>
                  <span className="cf-roadmap-column__count">
                    {stageItems.length}
                  </span>
                </header>
                <div className="cf-roadmap-column__list">
                  {stageItems.length === 0 ? (
                    <p className="cf-roadmap-column__empty">
                      {messages.roadmap.noItems}
                    </p>
                  ) : (
                    stageItems.map((item) => (
                      <RoadmapCard
                        key={item.id}
                        item={item}
                        onOpen={() => onItemOpen(item)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {canLoadMore && (
        <button
          type="button"
          className="cf-button"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {messages.board.loadMore}
        </button>
      )}
    </>
  );
}

function RoadmapCard({
  item,
  onOpen,
}: {
  item: RoadmapItem;
  onOpen: () => void;
}) {
  const { messages } = useFeedbackUi();

  return (
    <button type="button" className="cf-roadmap-card" onClick={onOpen}>
      <span className="cf-roadmap-card__meta">
        <span className="cf-roadmap-status">
          {messages.roadmap.statuses[item.status]}
        </span>
      </span>
      <strong className="cf-roadmap-card__title">{item.title}</strong>
      {item.description && (
        <span className="cf-roadmap-card__body">{item.description}</span>
      )}
      <span className="cf-roadmap-card__link">
        {messages.entry.open} <span aria-hidden="true">›</span>
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
      <header className="cf-roadmap-detail__header">
        <div className="cf-roadmap-card__meta">
          <span className="cf-roadmap-status">
            {messages.roadmap.statuses[item.status]}
          </span>
        </div>
        <h2 className="cf-board__title">{item.title}</h2>
        {item.description && (
          <p className="cf-entry__body">{item.description}</p>
        )}
      </header>
      <section className="cf-discussion">
        <h3>{messages.roadmap.attachedFeedback}</h3>
        {feedback.status === "LoadingFirstPage" ? (
          <p className="cf-state">{messages.board.loading}</p>
        ) : feedback.results.length === 0 ? (
          <p className="cf-state">{messages.roadmap.noAttachedFeedback}</p>
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
            {messages.board.loadMore}
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
          className="cf-roadmap-entry__content"
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
