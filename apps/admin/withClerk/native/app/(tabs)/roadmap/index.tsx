import {
  RoadmapScreen,
  type RoadmapToolbarProps,
} from "convex-feedback-admin-app-screens/native";
import { Stack, useRouter } from "expo-router";
import { useStackHeaderHeight } from "convex-feedback-ui/expo";

import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { roadmapRouteParams } from "@/lib/roadmap-route";

export default function RoadmapRoute() {
  const router = useRouter();
  const theme = useAdminTheme();
  const topInset = useStackHeaderHeight();
  const addIcon = useToolbarIcon("plus", "add");

  return (
    <RoadmapScreen
      onNewItem={() => router.push("/roadmap/new")}
      onOpenItem={(item) =>
        router.push({
          pathname: "/roadmap/[roadmapId]",
          params: roadmapRouteParams(item),
        })
      }
      renderToolbar={(toolbar) => (
        <RoadmapToolbar
          icons={{ add: addIcon }}
          theme={theme}
          toolbar={toolbar}
        />
      )}
      topInset={topInset}
    />
  );
}

function RoadmapToolbar({
  toolbar,
  theme,
  icons,
}: {
  toolbar: RoadmapToolbarProps;
  theme: ReturnType<typeof useAdminTheme>;
  icons: { add: ReturnType<typeof useToolbarIcon> };
}) {
  return (
    <Stack.Toolbar placement="right">
      {toolbar.canLoadMore && (
        <Stack.Toolbar.Button
          accessibilityLabel="Load more roadmap items"
          disabled={toolbar.loadingMore}
          onPress={toolbar.onLoadMore}
          tintColor={theme.text}
        >
          {toolbar.loadingMore ? "Loading…" : "More"}
        </Stack.Toolbar.Button>
      )}
      <Stack.Toolbar.Button
        accessibilityLabel="Add roadmap item"
        icon={icons.add}
        onPress={toolbar.onNewItem}
        tintColor={theme.primary}
        variant="prominent"
      >
        New item
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
