import { EditRoadmapScreen } from "convex-feedback-admin-app-screens/native";
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
      onClose={() => router.back()}
      roadmapId={params.roadmapId}
      routeItem={parseRoadmapRouteItem(params.item)}
    />
  );
}
