import { RoadmapScreen } from "convex-feedback-admin-app-screens/native";
import { useRouter } from "expo-router";
import { useStackHeaderHeight } from "convex-feedback-ui/expo";

import { roadmapRouteParams } from "@/lib/roadmap-route";

export default function RoadmapRoute() {
  const router = useRouter();
  const topInset = useStackHeaderHeight();

  return (
    <RoadmapScreen
      onNewItem={() => router.push("/roadmap/new")}
      onOpenItem={(item) =>
        router.push({
          pathname: "/roadmap/[roadmapId]",
          params: roadmapRouteParams(item),
        })
      }
      topInset={topInset}
    />
  );
}
