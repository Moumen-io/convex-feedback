import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import type { FeedbackScreenContentProps } from "../../../shared/types";
import { FeedbackScreenHeader } from "./FeedbackScreenHeader";
import { FeedbackScreenList } from "./FeedbackScreenList";
import { CreateEntryModal } from "./NewEntry";
import { FeedbackBoard } from "./primitives.js";

export function FeedbackScreenContent({
  showHeader = true,
  hideBackButton = false,
  onEntryOpen,
  ...colors
}: FeedbackScreenContentProps) {
  const { showForm, setShowForm, setSelectedEntryId } = useFeedbackBody();

  const handleEntryOpen = (entryId: string) => {
    setSelectedEntryId(entryId);
    onEntryOpen?.(entryId);
  };

  return (
    <>
      <FeedbackBoard.Root {...colors}>
        {showHeader && <FeedbackScreenHeader />}

        <FeedbackScreenList
          hideBackButton={hideBackButton}
          onEntryOpen={handleEntryOpen}
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
