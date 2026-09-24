import { RoadmapDetailScreen } from "convex-feedback-admin-app-screens/native";
import { goBackOrReplace } from "convex-feedback-ui/expo";
import { useLocalSearchParams, useRouter } from "expo-router";

import { parseRoadmapRouteItem, roadmapRouteParams } from "@/lib/roadmap-route";

export default function RoadmapDetailRoute() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  return (
    <RoadmapDetailScreen
      onClose={() => goBackOrReplace(router, "/roadmap")}
      onEdit={(item) =>
        router.push({
          pathname: "/roadmap/[roadmapId]/edit",
          params: roadmapRouteParams(item),
        })
      }
      onOpenEntry={(entryId) =>
        router.push({ pathname: "/feedback/[entryId]", params: { entryId } })
      }
      roadmapId={params.roadmapId}
      routeItem={parseRoadmapRouteItem(params.item)}
    />
  );
}
