import { useMemo } from "react";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import type { FeedbackScreenReplyListProps } from "../../../shared/types";
import { Button } from "./Button";
import { CommentBranch } from "./CommentBranch";
import { Comment } from "./primitives";

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
