import { Pressable, View } from "react-native";

import type { FeedbackScreenEntryCardProps } from "../../../shared/types";
import { allowAuthenticatedAction } from "../../../shared/helpers.js";
import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import { useNativeAction } from "../helpers.js";
import { FeedbackEntry } from "./primitives";

export function EntryCard({
  entry,
  hooks,
  onOpen,
}: FeedbackScreenEntryCardProps) {
  const { isAuthenticated, onUnauthenticated } = useFeedbackBody();
  const setUpvote = hooks.useSetEntryUpvote();
  const action = useNativeAction();

  const toggleUpvote = (desiredState: boolean) => {
    if (
      !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
      action.pending
    ) {
      return;
    }
    void action.run(
      () => setUpvote({ entryId: entry.id, desiredState }),
      "Could not update vote",
    );
  };

  return (
    <FeedbackEntry.Root entry={entry}>
      <FeedbackEntry.Upvote
        disabled={isAuthenticated === undefined || action.pending}
        onToggle={toggleUpvote}
      />
      <Pressable onPress={onOpen} style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <FeedbackEntry.Kind />
          <FeedbackEntry.Status />
        </View>
        <FeedbackEntry.Title />
        <FeedbackEntry.Body numberOfLines={3} />
        <FeedbackEntry.CommentCount />
      </Pressable>
    </FeedbackEntry.Root>
  );
}
