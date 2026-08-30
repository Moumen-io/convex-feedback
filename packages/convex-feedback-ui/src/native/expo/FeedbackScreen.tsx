import { FeedbackBodyProvider } from "../../shared/context/FeedbackBodyProvider";
import { FeedbackProvider } from "../../shared/context/FeedbackProvider";
import { kinds } from "../../shared/helpers";
import { ExpoFeedbackBody } from "./ExpoFeedbackBody";
import type { ExpoFeedbackScreenProps } from "./types";
import { collectExpoMetadata } from "./metadata";

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
  collectMetadata,
  transformComments,
  renderActor,
  ...props
}: ExpoFeedbackScreenProps) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <FeedbackBodyProvider
        hooks={hooks}
        entrySort={entrySort}
        commentSort={commentSort}
        enabledKinds={enabledKinds}
        maxCommentDepth={maxCommentDepth}
        debounceDuration={debounceDuration}
        collectMetadata={collectMetadata}
        collectStandardMetadata={collectExpoMetadata}
        transformComments={transformComments}
        renderActor={renderActor}
      >
        <ExpoFeedbackBody {...props} />
      </FeedbackBodyProvider>
    </FeedbackProvider>
  );
}
