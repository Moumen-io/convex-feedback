import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import type { FeedbackScreenContentProps } from "../../../shared/types";
import { allowAuthenticatedAction } from "../../../shared/helpers.js";
import { FeedbackScreenHeader } from "./FeedbackScreenHeader";
import { FeedbackScreenList } from "./FeedbackScreenList";
import { CreateEntryModal } from "./NewEntry";
import { FeedbackBoard } from "./primitives.js";

export function FeedbackScreenContent({
  showHeader = true,
  hideBackButton = false,
  onEntryOpen,
  onCreateEntry,
  ...colors
}: FeedbackScreenContentProps) {
  const {
    showForm,
    setShowForm,
    setSelectedEntryId,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();

  const handleEntryOpen = (entryId: string) => {
    setSelectedEntryId(entryId);
    onEntryOpen?.(entryId);
  };

  const handleCreateEntry = () => {
    if (allowAuthenticatedAction(isAuthenticated, onUnauthenticated)) {
      (onCreateEntry ?? (() => setShowForm(true)))();
    }
  };

  return (
    <>
      <FeedbackBoard.Root {...colors}>
        {showHeader && <FeedbackScreenHeader />}

        <FeedbackScreenList
          hideBackButton={hideBackButton}
          onEntryOpen={handleEntryOpen}
          onCreateEntry={handleCreateEntry}
        />
      </FeedbackBoard.Root>

      {showForm && (
        <CreateEntryModal
          onRequestClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            setSelectedEntryId(id);
          }}
        />
      )}
    </>
  );
}
