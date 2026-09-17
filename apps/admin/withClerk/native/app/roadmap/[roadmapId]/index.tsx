import {
  RoadmapDetailScreen,
  type RoadmapDetailToolbarProps,
} from "convex-feedback-admin-app-screens/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { parseRoadmapRouteItem, roadmapRouteParams } from "@/lib/roadmap-route";

export default function RoadmapDetailRoute() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const editIcon = useToolbarIcon("pencil", "edit");
  const actionsIcon = useToolbarIcon("ellipsis.circle", "more_vert");

  return (
    <RoadmapDetailScreen
      onClose={() => router.back()}
      onEdit={(item) =>
        router.push({
          pathname: "/roadmap/[roadmapId]/edit",
          params: roadmapRouteParams(item),
        })
      }
      onOpenEntry={(entryId) =>
        router.push({
          pathname: "/feedback/[entryId]",
          params: { entryId },
        })
      }
      renderToolbar={(toolbar) => (
        <RoadmapDetailToolbar
          icons={{ close: closeIcon, edit: editIcon, actions: actionsIcon }}
          theme={theme}
          toolbar={toolbar}
        />
      )}
      roadmapId={params.roadmapId}
      routeItem={parseRoadmapRouteItem(params.item)}
    />
  );
}

function RoadmapDetailToolbar({
  toolbar,
  theme,
  icons,
}: {
  toolbar: RoadmapDetailToolbarProps;
  theme: ReturnType<typeof useAdminTheme>;
  icons: {
    close: ReturnType<typeof useToolbarIcon>;
    edit: ReturnType<typeof useToolbarIcon>;
    actions: ReturnType<typeof useToolbarIcon>;
  };
}) {
  return (
    <>
      <Stack.Screen options={{ title: toolbar.item.title }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close roadmap details"
          icon={icons.close}
          onPress={toolbar.onClose}
          tintColor={theme.text}
        >
          Close
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Edit roadmap item"
          disabled={toolbar.pending}
          icon={icons.edit}
          onPress={() => toolbar.onEdit(toolbar.item)}
          tintColor={theme.primary}
        >
          Edit
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          accessibilityLabel="Roadmap actions"
          disabled={toolbar.pending}
          icon={icons.actions}
          tintColor={theme.text}
          title="Actions"
        >
          <Stack.Toolbar.MenuAction
            destructive
            disabled={toolbar.pending}
            onPress={toolbar.onDelete}
          >
            Delete roadmap item
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
