import {
  EntryForm,
  type EntryFormToolbarProps,
} from "convex-feedback-admin-app-screens/native";
import { Stack, useRouter } from "expo-router";

import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";

export default function NewFeedbackScreen() {
  const router = useRouter();
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const kindIcon = useToolbarIcon("tag", "label");
  const saveIcon = useToolbarIcon("checkmark", "check");

  return (
    <EntryForm
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

export function EntryFormToolbar({
  props,
  theme,
  icons,
}: {
  props: EntryFormToolbarProps;
  theme: ReturnType<typeof useAdminTheme>;
  icons: {
    close: ReturnType<typeof useToolbarIcon>;
    kind: ReturnType<typeof useToolbarIcon>;
    save: ReturnType<typeof useToolbarIcon>;
  };
}) {
  const kinds = [
    ["feedback", "Feedback"],
    ["feature_request", "Feature request"],
    ["bug_report", "Bug report"],
  ] as const;

  return (
    <>
      <Stack.Screen options={{ title: "New feedback" }} />
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
        <Stack.Toolbar.Menu
          accessibilityLabel="Change feedback kind"
          disabled={props.pending}
          icon={icons.kind}
          tintColor={theme.text}
          title="Kind"
        >
          {kinds.map(([value, label]) => (
            <Stack.Toolbar.MenuAction
              disabled={props.pending}
              isOn={props.kind === value}
              key={value}
              onPress={() => props.setKind(value)}
            >
              {label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          accessibilityLabel="Create feedback"
          disabled={!props.title.trim() || !props.body.trim() || props.pending}
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
