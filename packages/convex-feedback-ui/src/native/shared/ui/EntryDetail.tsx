import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import { allowAuthenticatedAction } from "../../../shared/helpers.js";
import type { FeedbackScreenEntryDetailProps } from "../../../shared/types";
import { Button } from "./Button";
import { CommentBranch } from "./CommentBranch";
import { EditEntryModal } from "./EditEntry.js";
import { FeedbackEntry, FeedbackForm } from "./primitives";
import { MetadataModal } from "./MetadataModal";
import { useNativeAction } from "../helpers.js";

export function EntryDetail({
  entryId,
  onBack,
  hideBackButton,
  hideEditButton = false,
}: FeedbackScreenEntryDetailProps) {
  const {
    hooks,
    commentSort,
    transformComments,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();

  const { messages, theme } = useFeedbackUi();
  const entry = hooks.useEntry(entryId);
  const comments = hooks.useComments({ entryId, sort: commentSort });
  const setUpvote = hooks.useSetEntryUpvote();
  const createComment = hooks.useCreateComment();
  const [body, setBody] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const upvoteAction = useNativeAction();
  const commentAction = useNativeAction();

  const toggleUpvote = (desiredState: boolean) => {
    if (
      !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
      upvoteAction.pending
    ) {
      return;
    }
    void upvoteAction.run(
      () => setUpvote({ entryId, desiredState }),
      "Could not update vote",
    );
  };
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
          disabled={isAuthenticated === undefined || upvoteAction.pending}
          onToggle={toggleUpvote}
        />
        <FeedbackEntry.Content style={{ gap: 5 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <View style={{ flex: 1, gap: 5 }}>
              <FeedbackEntry.Kind />
              <FeedbackEntry.Status />
            </View>
            {!hideEditButton && entry.viewerIsAuthor === true && (
              <Button
                label={messages.entry.edit}
                onPress={() => setEditOpen(true)}
              />
            )}
          </View>
          <FeedbackEntry.Title />
          <FeedbackEntry.Body />
          <FeedbackEntry.CommentCount />
        </FeedbackEntry.Content>
      </FeedbackEntry.Root>
      {editOpen && (
        <EditEntryModal
          entry={entry}
          onRequestClose={() => setEditOpen(false)}
        />
      )}
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
          disabled={isAuthenticated === undefined || commentAction.pending}
          submitting={commentAction.pending}
          onPress={() => {
            if (body.trim().length === 0) return;
            if (
              !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
              commentAction.pending
            ) {
              return;
            }
            void commentAction.run(async () => {
              await createComment({ entryId, body });
              setBody("");
            }, "Could not add comment");
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
      {(comments.status === "CanLoadMore" ||
        comments.status === "LoadingMore") && (
        <Button
          label={messages.comments.loadMore}
          disabled={comments.status === "LoadingMore"}
          onPress={() => comments.loadMore(hooks.pageSizes.comments)}
        />
      )}
    </View>
  );
}
