import { useRouter } from "expo-router";
import {
  RoadmapStackLayout,
  roadmapStackSettings,
} from "convex-feedback-ui/expo";

import { feedbackHooks } from "../../feedback";

export const unstable_settings = roadmapStackSettings;

export default function RoadmapLayout() {
  const router = useRouter();

  return (
    <RoadmapStackLayout
      hooks={feedbackHooks}
      theme={{
        colors: {
          primary: "#5b5bd6",
          background: "#f7f7fa",
        },
      }}
      messages={{ roadmap: { title: "Product roadmap" } }}
      onEntryOpen={(entryId) =>
        router.push({ pathname: "/feedback/[entryId]", params: { entryId } })
      }
    />
  );
}
