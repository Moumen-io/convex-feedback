import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";
import type { FeedbackScreenCommentBranchProps } from "../../../shared/types";
import { Button } from "./Button";
import { Comment, FeedbackForm } from "./primitives.js";

import type { FeedbackScreenReplyListProps } from "../../../shared/types";

export function ReplyList({
  entryId,
  parentCommentId,
}: FeedbackScreenReplyListProps) {
  const { hooks, commentSort, transformComments } = useFeedbackBody();
  const { messages } = useFeedbackUi();

  const replies = hooks.useComments({
    entryId,
    parentCommentId,
    sort: commentSort,
  });

  const visible = useMemo(
    () => transformComments?.(replies.results) ?? replies.results,
    [replies.results, transformComments],
  );

  return (
    <Comment.Children>
      {visible.map((reply) => (
        <CommentBranch key={reply.id} comment={reply} entryId={entryId} />
      ))}
      {replies.status === "CanLoadMore" && (
        <Button
          label={messages.comments.loadMore}
          onPress={() => replies.loadMore(hooks.pageSizes.replies)}
        />
      )}
    </Comment.Children>
  );
}

export function CommentBranch({
  comment,
  entryId,
}: FeedbackScreenCommentBranchProps) {
  const { hooks, maxCommentDepth, renderActor } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const setLike = hooks.useSetCommentLike();
  const createComment = hooks.useCreateComment();

  return (
    <Comment.Root comment={comment}>
      {renderActor === undefined ? null : (
        <View>{renderActor(comment.actorId)}</View>
      )}
      <Comment.Body />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Comment.Like
          onToggle={(active) =>
            void setLike({ commentId: comment.id, desiredState: active })
          }
        />
        {comment.body !== null && comment.depth < maxCommentDepth ? (
          <Comment.Reply onActivate={() => setReplying((value) => !value)} />
        ) : null}
        <Comment.RepliesButton
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </View>
      {replying ? (
        <FeedbackForm.Root>
          <FeedbackForm.Textarea
            value={replyBody}
            onChangeText={setReplyBody}
            placeholder={messages.comments.placeholder}
          />
          <FeedbackForm.Submit
            onPress={async () => {
              if (replyBody.trim().length === 0) return;
              await createComment({
                entryId,
                parentCommentId: comment.id,
                body: replyBody,
              });
              setReplyBody("");
              setReplying(false);
              setExpanded(true);
            }}
          >
            {messages.comments.reply}
          </FeedbackForm.Submit>
          <Button
            label={messages.comments.cancelReply}
            onPress={() => setReplying(false)}
          />
        </FeedbackForm.Root>
      ) : null}
      {expanded ? (
        <ReplyList entryId={entryId} parentCommentId={comment.id} />
      ) : null}
      {comment.deletedAt !== undefined ? (
        <Text style={{ color: theme.colors.mutedText, fontSize: 11 }}>
          {messages.comments.deleted}
        </Text>
      ) : null}
    </Comment.Root>
  );
}
