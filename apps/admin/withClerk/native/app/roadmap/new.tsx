import {
  RoadmapForm,
  type RoadmapFormToolbarProps,
} from "convex-feedback-admin-app-screens/native";
import { Stack, useRouter } from "expo-router";

import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";

export default function NewRoadmapScreen() {
  const router = useRouter();
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const saveIcon = useToolbarIcon("checkmark", "check");

  return (
    <RoadmapForm
      onClose={() => router.back()}
      renderToolbar={(props) => (
        <RoadmapFormToolbar
          icons={{ close: closeIcon, save: saveIcon }}
          props={props}
          theme={theme}
        />
      )}
    />
  );
}

export function RoadmapFormToolbar({
  props,
  theme,
  icons,
}: {
  props: RoadmapFormToolbarProps;
  theme: ReturnType<typeof useAdminTheme>;
  icons: {
    close: ReturnType<typeof useToolbarIcon>;
    save: ReturnType<typeof useToolbarIcon>;
  };
}) {
  return (
    <>
      <Stack.Screen
        options={{
          title: props.isEdit ? "Edit roadmap item" : "New roadmap item",
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Cancel"
          disabled={props.pending}
          icon={icons.close}
          onPress={props.onClose}
          tintColor={theme.text}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={
            props.isEdit ? "Save changes" : "Create roadmap item"
          }
          disabled={!props.title.trim() || props.pending}
          icon={icons.save}
          onPress={props.save}
          tintColor={theme.primary}
          variant="done"
        >
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
