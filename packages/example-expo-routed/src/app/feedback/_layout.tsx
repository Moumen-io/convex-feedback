import {
  FeedbackStackLayout,
  feedbackStackSettings,
} from "convex-feedback-ui/expo";
import { feedbackHooks } from "../../feedback";

export const unstable_settings = feedbackStackSettings;

export default function FeedbackLayout() {
  return (
    <FeedbackStackLayout
      hooks={feedbackHooks}
      theme={{
        colors: {
          primary: "#5b5bd6",
          background: "#f7f7fa",
        },
      }}
      messages={{ board: { title: "Product feedback" } }}
    />
  );
}
