import { EditRoadmapScreen } from "convex-feedback-admin-app-screens/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { RoadmapFormToolbar } from "../new";
import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { parseRoadmapRouteItem } from "@/lib/roadmap-route";

export default function EditRoadmapScreenRoute() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const saveIcon = useToolbarIcon("checkmark", "check");

  return (
    <EditRoadmapScreen
      onClose={() => router.back()}
      renderToolbar={(props) => (
        <RoadmapFormToolbar
          icons={{ close: closeIcon, save: saveIcon }}
          props={props}
          theme={theme}
        />
      )}
      roadmapId={params.roadmapId}
      routeItem={parseRoadmapRouteItem(params.item)}
    />
  );
}
