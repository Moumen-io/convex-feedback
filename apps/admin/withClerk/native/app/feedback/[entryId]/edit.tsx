import { EditFeedbackScreen } from "convex-feedback-admin-app-screens/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { EntryFormToolbar } from "../new";
import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";

export default function EditFeedbackScreenRoute() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const kindIcon = useToolbarIcon("tag", "label");
  const saveIcon = useToolbarIcon("checkmark", "check");

  return (
    <EditFeedbackScreen
      entryId={entryId}
      onClose={() => router.back()}
      renderToolbar={(props) => (
        <EntryFormToolbar
          icons={{ close: closeIcon, kind: kindIcon, save: saveIcon }}
          props={props}
          theme={theme}
        />
      )}
    />
  );
}
