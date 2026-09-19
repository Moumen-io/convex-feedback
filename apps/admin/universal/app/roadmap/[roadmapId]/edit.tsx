import { EditRoadmapScreen } from "convex-feedback-admin-app-screens/native";
import { goBackOrReplace } from "convex-feedback-ui/expo";
import { useLocalSearchParams, useRouter } from "expo-router";

import { parseRoadmapRouteItem } from "@/lib/roadmap-route";

export default function EditRoadmapScreenRoute() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  return (
    <EditRoadmapScreen
      onClose={() => goBackOrReplace(router, "/roadmap")}
      roadmapId={params.roadmapId}
      routeItem={parseRoadmapRouteItem(params.item)}
    />
  );
}
