import type { EntryPriority, EntryStatus } from "convex-feedback";
import {
  FeedbackDetailScreen,
  type FeedbackDetailToolbarProps,
} from "convex-feedback-admin-app-screens/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Platform } from "react-native";

import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { roadmapRouteParams } from "@/lib/roadmap-route";

export default function FeedbackDetailRoute() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const statusIcon = useToolbarIcon("checkmark.circle", "check_circle");
  const priorityIcon = useToolbarIcon("flag", "flag");
  const metadataIcon = useToolbarIcon("info.circle", "info");
  const editIcon = useToolbarIcon("pencil", "edit");

  return (
    <FeedbackDetailScreen
      entryId={entryId}
      onClose={() => router.back()}
      onEdit={(id) =>
        router.push({
          pathname: "/feedback/[entryId]/edit",
          params: { entryId: id },
        })
      }
      onOpenRoadmap={(item) =>
        router.push({
          pathname: "/roadmap/[roadmapId]",
          params: roadmapRouteParams(item),
        })
      }
      renderToolbar={(toolbar) => (
        <FeedbackToolbar
          icons={{
            close: closeIcon,
            edit: editIcon,
            metadata: metadataIcon,
            priority: priorityIcon,
            status: statusIcon,
          }}
          theme={theme}
          toolbar={toolbar}
        />
      )}
    />
  );
}

function FeedbackToolbar({
  toolbar,
  theme,
  icons,
}: {
  toolbar: FeedbackDetailToolbarProps;
  theme: ReturnType<typeof useAdminTheme>;
  icons: {
    close: ReturnType<typeof useToolbarIcon>;
    edit: ReturnType<typeof useToolbarIcon>;
    metadata: ReturnType<typeof useToolbarIcon>;
    priority: ReturnType<typeof useToolbarIcon>;
    status: ReturnType<typeof useToolbarIcon>;
  };
}) {
  const statuses: { value: EntryStatus; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "under_review", label: "Under review" },
    { value: "planned", label: "Planned" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "closed", label: "Closed" },
  ];
  const priorities: { value: EntryPriority | null; label: string }[] = [
    { value: null, label: "None" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];
  const entry = toolbar.entry;

  return (
    <>
      <Stack.Screen options={{ title: entry?.title ?? "Feedback" }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close feedback details"
          icon={icons.close}
          onPress={toolbar.onClose}
          tintColor={theme.text}
        >
          Close
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {entry && (
        <Stack.Toolbar placement={Platform.OS === "ios" ? "bottom" : "right"}>
          <Stack.Toolbar.Spacer hidden={Platform.OS !== "ios"} />
          <Stack.Toolbar.Button
            accessibilityLabel="Edit feedback"
            icon={icons.edit}
            onPress={() => toolbar.onEdit(entry.id)}
            tintColor={theme.primary}
          >
            Edit
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Spacer hidden={Platform.OS !== "ios"} />
          <Stack.Toolbar.Menu
            accessibilityLabel="Change status"
            disabled={toolbar.pending}
            icon={icons.status}
            tintColor={theme.text}
            title="Status"
          >
            {statuses.map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                disabled={toolbar.pending}
                isOn={entry.status === value}
                key={value}
                onPress={() => toolbar.onStatusChange(value)}
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            accessibilityLabel="Change priority"
            disabled={toolbar.pending}
            icon={icons.priority}
            tintColor={theme.text}
            title="Priority"
          >
            {priorities.map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                disabled={toolbar.pending}
                isOn={(entry.priority ?? null) === value}
                key={value ?? "none"}
                onPress={() => toolbar.onPriorityChange(value)}
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Button
            accessibilityLabel="Show metadata"
            icon={icons.metadata}
            onPress={toolbar.onShowMetadata}
            tintColor={
              entry.metadata === undefined ? theme.warning : theme.text
            }
          >
            Metadata
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
    </>
  );
}
