import { RoadmapForm } from "convex-feedback-admin-app-screens/native";
import { goBackOrReplace } from "convex-feedback-ui/expo";
import { useRouter } from "expo-router";

export default function NewRoadmapScreen() {
  const router = useRouter();

  return <RoadmapForm onClose={() => goBackOrReplace(router, "/roadmap")} />;
}
