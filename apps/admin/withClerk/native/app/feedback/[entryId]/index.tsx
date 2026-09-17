import { FeedbackDetailScreen } from "convex-feedback-admin-app-screens/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { roadmapRouteParams } from "@/lib/roadmap-route";

export default function FeedbackDetailRoute() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();

  return (
    <FeedbackDetailScreen
      entryId={entryId}
      onClose={() => router.back()}
      onEdit={(id) =>
        router.push({
          pathname: "/feedback/[entryId]/edit",
          params: { entryId: id },
        })
      }
      onOpenRoadmap={(item) =>
        router.push({
          pathname: "/roadmap/[roadmapId]",
          params: roadmapRouteParams(item),
        })
      }
    />
  );
}
