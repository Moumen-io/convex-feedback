import {
  InboxScreen,
  InboxToolbar,
} from "convex-feedback-admin-app-screens/native";
import { useRouter } from "expo-router";

export default function InboxRoute() {
  const router = useRouter();

  return (
    <InboxScreen
      onNewFeedback={() => router.push("/feedback/new")}
      onOpenEntry={(entryId) =>
        router.push({
          pathname: "/feedback/[entryId]",
          params: { entryId },
        })
      }
      renderToolbar={(toolbar) => <InboxToolbar toolbar={toolbar} />}
    />
  );
}
