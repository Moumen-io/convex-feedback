import { EntryForm } from "convex-feedback-admin-app-screens/native";
import { useRouter } from "expo-router";

export default function NewFeedbackScreen() {
  const router = useRouter();
  return <EntryForm onClose={() => router.back()} />;
}
