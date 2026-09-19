import { RoadmapForm } from "convex-feedback-admin-app-screens/native";
import { useRouter } from "expo-router";

export default function NewRoadmapScreen() {
  const router = useRouter();
  return <RoadmapForm onClose={() => router.back()} />;
}
