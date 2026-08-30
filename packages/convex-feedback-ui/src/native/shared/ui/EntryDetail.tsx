import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import type { FeedbackScreenEntryDetailProps } from "../../../shared/types";
import { Button } from "./Button";
import { CommentBranch } from "./CommentBranch";
import { FeedbackEntry, FeedbackForm } from "./primitives";
import { MetadataModal } from "./MetadataModal";

export function EntryDetail({
  entryId,
  onBack,
  hideBackButton,
}: FeedbackScreenEntryDetailProps) {
  const { hooks, commentSort, transformComments } = useFeedbackBody();

  const { messages, theme } = useFeedbackUi();
  const entry = hooks.useEntry(entryId);
  const comments = hooks.useComments({ entryId, sort: commentSort });
  const setUpvote = hooks.useSetEntryUpvote();
  const createComment = hooks.useCreateComment();
  const [body, setBody] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const visible = useMemo(
    () => transformComments?.(comments.results) ?? comments.results,
    [comments.results, transformComments],
  );

  if (entry === undefined)
    return (
      <View
        style={{
          flex: 1,
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ color: theme.colors.mutedText }}>
          {messages.board.loading}
        </Text>
      </View>
    );

  if (entry === null) {
    if (hideBackButton) return;
    return <Button label={messages.entry.back} onPress={onBack} />;
  }

  return (
    <View style={{ gap: 12 }}>
      {!hideBackButton && (
        <Button label={messages.entry.back} onPress={onBack} />
      )}
      <FeedbackEntry.Root entry={entry}>
        <FeedbackEntry.Upvote
          onToggle={(active) =>
            void setUpvote({ entryId, desiredState: active })
          }
        />
        <FeedbackEntry.Content style={{ gap: 5 }}>
          <FeedbackEntry.Status />
          <FeedbackEntry.Title />
          <FeedbackEntry.Body />
          <FeedbackEntry.CommentCount />
        </FeedbackEntry.Content>
      </FeedbackEntry.Root>
      {entry.metadata !== undefined && (
        <Button
          label={messages.metadata.view}
          onPress={() => setShowMetadata(true)}
        />
      )}
      {showMetadata && entry.metadata !== undefined && (
        <MetadataModal
          metadata={entry.metadata}
          onRequestClose={() => setShowMetadata(false)}
        />
      )}
      <Text
        style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}
      >
        {messages.comments.title}
      </Text>
      <FeedbackForm.Root>
        <FeedbackForm.Textarea
          value={body}
          onChangeText={setBody}
          placeholder={messages.comments.placeholder}
        />
        <FeedbackForm.Submit
          onPress={async () => {
            if (body.trim().length === 0) return;
            await createComment({ entryId, body });
            setBody("");
          }}
        >
          {messages.comments.submit}
        </FeedbackForm.Submit>
      </FeedbackForm.Root>
      <View style={{ gap: 8 }}>
        {visible.map((comment) => (
          <CommentBranch key={comment.id} comment={comment} entryId={entryId} />
        ))}
      </View>
      {comments.status === "CanLoadMore" && (
        <Button
          label={messages.comments.loadMore}
          onPress={() => comments.loadMore(hooks.pageSizes.comments)}
        />
      )}
    </View>
  );
}
