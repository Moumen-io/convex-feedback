import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";
import type { FeedbackScreenListProps } from "../../../shared/types/index.js";
import { Button } from "./Button.js";
import { EntryCard } from "./EntryCard.js";
import { EntryDetail } from "./EntryDetail.js";
import { FeedbackBoard } from "./primitives.js";

export function FeedbackScreenList({
  hideBackButton = false,
  showSelectedEntry = true,
  onEntryOpen,
}: FeedbackScreenListProps) {
  const {
    hooks,
    entrySort,
    isSearching,
    enabledKinds,
    selectedEntryId,
    debouncedQuery,
    setSelectedEntryId,
  } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();

  const list = hooks.useEntries({ sort: entrySort, kinds: enabledKinds });
  const search = hooks.useSearchEntries({
    searchQuery: debouncedQuery,
    kinds: enabledKinds,
  });

  const entries = isSearching ? search : list.results;

  return (
    <>
      <FeedbackBoard.List style={{ padding: theme.spacing }}>
        {showSelectedEntry && selectedEntryId ? (
          <EntryDetail
            entryId={selectedEntryId}
            hideBackButton={hideBackButton}
            onBack={() => setSelectedEntryId(null)}
          />
        ) : (
          (entries ?? []).map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              hooks={hooks}
              onOpen={() => onEntryOpen(entry.id)}
            />
          ))
        )}
      </FeedbackBoard.List>

      {!isSearching && list.status === "CanLoadMore" && (
        <Button
          label={messages.board.loadMore}
          onPress={() => list.loadMore(hooks.pageSizes.entries)}
        />
      )}
    </>
  );
}
