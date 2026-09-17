import { EditFeedbackScreen } from "convex-feedback-admin-app-screens/native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function EditFeedbackScreenRoute() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();

  return <EditFeedbackScreen entryId={entryId} onClose={() => router.back()} />;
}
