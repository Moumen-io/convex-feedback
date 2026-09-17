import {
  RoadmapForm,
  RoadmapFormToolbar,
} from "convex-feedback-admin-app-screens/native";
import { useRouter } from "expo-router";

export default function NewRoadmapScreen() {
  const router = useRouter();

  return (
    <RoadmapForm
      onClose={() => router.back()}
      renderToolbar={(props) => <RoadmapFormToolbar {...props} />}
    />
  );
}
