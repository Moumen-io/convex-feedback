import { FeedbackBodyProvider } from "../../shared/context/FeedbackBodyProvider";
import { FeedbackProvider } from "../../shared/context/FeedbackProvider";
import { kinds } from "../../shared/helpers";
import type { FeedbackScreenRootProps } from "../../shared/types";
import { FeedbackScreenContent } from "../shared/ui/BodyContent";

export function FeedbackScreen({
  hooks,
  messages,
  theme,
  unstyled,
  entrySort = "top",
  commentSort = "top",
  enabledKinds = kinds,
  maxCommentDepth = 5,
  debounceDuration = 300,
  transformComments,
  renderActor,
  ...props
}: FeedbackScreenRootProps) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <FeedbackBodyProvider
        hooks={hooks}
        entrySort={entrySort}
        commentSort={commentSort}
        enabledKinds={enabledKinds}
        maxCommentDepth={maxCommentDepth}
        debounceDuration={debounceDuration}
        transformComments={transformComments}
        renderActor={renderActor}
      >
        <FeedbackScreenContent {...props} />
      </FeedbackBodyProvider>
    </FeedbackProvider>
  );
}
