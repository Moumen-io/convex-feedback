import { Text } from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";
import { createEntryLabel } from "../../../shared/helpers.js";
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
    isSearching,
    enabledKinds,
    statusFilter,
    selectedEntryId,
    debouncedQuery,
    setSelectedEntryId,
    setShowForm,
    emptyState,
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

  const entries = isSearching ? search : list.results;
  const createEntry = onCreateEntry ?? (() => setShowForm(true));

  const loading = isSearching
    ? search === undefined
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
          <Text style={{ color: theme.colors.mutedText }}>
            {messages.board.loading}
          </Text>
        </FeedbackBoard.State>
      ) : entries !== undefined && entries.length === 0 ? (
        <FeedbackBoard.State>
          {emptyState}
          <Text style={{ color: theme.colors.mutedText, textAlign: "center" }}>
            {isSearching
              ? messages.board.noSearchResults
              : messages.board.noEntries}
          </Text>
          <Button
            label={createEntryLabel(enabledKinds, messages)}
            onPress={createEntry}
            variant="primary"
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

      {!isSearching && list.status === "CanLoadMore" && (
        <Button
          label={messages.board.loadMore}
          onPress={() => list.loadMore(hooks.pageSizes.entries)}
        />
      )}
    </>
  );
}
