import { EntryForm } from "convex-feedback-admin-app-screens/native";
import { goBackOrReplace } from "convex-feedback-ui/expo";
import { useRouter } from "expo-router";

export default function NewFeedbackScreen() {
  const router = useRouter();
  return <EntryForm onClose={() => goBackOrReplace(router, "/inbox")} />;
}
