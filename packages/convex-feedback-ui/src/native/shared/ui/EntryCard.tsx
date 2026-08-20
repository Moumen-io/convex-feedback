import { Pressable, View } from "react-native";

import type { FeedbackScreenEntryCardProps } from "../../../shared/types";
import { FeedbackEntry } from "./primitives";

export function EntryCard({
  entry,
  hooks,
  onOpen,
}: FeedbackScreenEntryCardProps) {
  const setUpvote = hooks.useSetEntryUpvote();
  return (
    <FeedbackEntry.Root entry={entry}>
      <FeedbackEntry.Upvote
        onToggle={(active) =>
          void setUpvote({ entryId: entry.id, desiredState: active })
        }
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
