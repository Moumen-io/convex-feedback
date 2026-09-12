import { ActivityIndicator, Text } from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";
import {
  allowAuthenticatedAction,
  createEntryLabel,
} from "../../../shared/helpers.js";
import type { FeedbackScreenListProps } from "../../../shared/types/index.js";
import { Button } from "./Button.js";
import { EntryCard } from "./EntryCard.js";
import { EntryDetail } from "./EntryDetail.js";
import { FeedbackBoard } from "./primitives.js";

export function FeedbackScreenList({
  hideBackButton = false,
  showSelectedEntry = true,
  onEntryOpen,
  onCreateEntry,
}: FeedbackScreenListProps) {
  const {
    hooks,
    entrySort,
    enabledKinds,
    statusFilter,
    selectedEntryId,
    query,
    debouncedQuery,
    setSelectedEntryId,
    setShowForm,
    emptyState,
    loading: loadingIndicator,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();

  const list = hooks.useEntries({
    sort: entrySort,
    kinds: enabledKinds,
    statusFilter,
  });
  const search = hooks.useSearchEntries({
    searchQuery: debouncedQuery,
    kinds: enabledKinds,
    statusFilter,
  });

  const normalizedQuery = query.trim();
  const normalizedDebouncedQuery = debouncedQuery.trim();
  const searching = normalizedQuery.length > 0;
  const entries = searching ? search : list.results;
  const createEntry = () => {
    if (allowAuthenticatedAction(isAuthenticated, onUnauthenticated)) {
      (onCreateEntry ?? (() => setShowForm(true)))();
    }
  };

  const loading = searching
    ? normalizedQuery !== normalizedDebouncedQuery || search === undefined
    : list.status === "LoadingFirstPage";

  return (
    <>
      {showSelectedEntry && selectedEntryId ? (
        <FeedbackBoard.List style={{ padding: theme.spacing }}>
          <EntryDetail
            entryId={selectedEntryId}
            hideBackButton={hideBackButton}
            onBack={() => setSelectedEntryId(null)}
          />
        </FeedbackBoard.List>
      ) : loading ? (
        <FeedbackBoard.State>
          {loadingIndicator ?? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
        </FeedbackBoard.State>
      ) : entries !== undefined && entries.length === 0 ? (
        <FeedbackBoard.State>
          {emptyState}
          <Text style={{ color: theme.colors.mutedText, textAlign: "center" }}>
            {searching
              ? messages.board.noSearchResults
              : messages.board.noEntries}
          </Text>
          <Button
            label={createEntryLabel(enabledKinds, messages)}
            onPress={createEntry}
            variant="primary"
            disabled={isAuthenticated === undefined}
          />
        </FeedbackBoard.State>
      ) : (
        <FeedbackBoard.List style={{ padding: theme.spacing }}>
          {(entries ?? []).map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              hooks={hooks}
              onOpen={() => onEntryOpen(entry.id)}
            />
          ))}
        </FeedbackBoard.List>
      )}

      {!searching &&
        (list.status === "CanLoadMore" || list.status === "LoadingMore") && (
          <Button
            label={messages.board.loadMore}
            disabled={list.status === "LoadingMore"}
            onPress={() => list.loadMore(hooks.pageSizes.entries)}
          />
        )}
    </>
  );
}
