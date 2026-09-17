import {
  InboxScreen,
  type InboxToolbarProps,
} from "convex-feedback-admin-app-screens/native";
import { Stack, useRouter } from "expo-router";
import { useRef } from "react";
import type { SearchBarCommands } from "react-native-screens";

import { useAdminTheme } from "@/constants/AdminTheme";
import { useToolbarIcon } from "@/lib/native-toolbar";

export default function InboxRoute() {
  const router = useRouter();
  const theme = useAdminTheme();
  const searchRef = useRef<SearchBarCommands>(null);
  const addIcon = useToolbarIcon("plus", "add");
  const filterIcon = useToolbarIcon(
    "line.3.horizontal.decrease",
    "filter_list",
  );

  return (
    <InboxScreen
      onNewFeedback={() => router.push("/feedback/new")}
      onOpenEntry={(entryId) =>
        router.push({
          pathname: "/feedback/[entryId]",
          params: { entryId },
        })
      }
      renderToolbar={(toolbar) => (
        <InboxToolbar
          icons={{ add: addIcon, filter: filterIcon }}
          searchRef={searchRef}
          theme={theme}
          toolbar={toolbar}
        />
      )}
    />
  );
}

function searchText(event: unknown): string {
  const value = event as { nativeEvent?: { text?: unknown } };
  return typeof value.nativeEvent?.text === "string"
    ? value.nativeEvent.text
    : "";
}

function InboxToolbar({
  toolbar,
  theme,
  icons,
  searchRef,
}: {
  toolbar: InboxToolbarProps;
  theme: ReturnType<typeof useAdminTheme>;
  icons: {
    add: ReturnType<typeof useToolbarIcon>;
    filter: ReturnType<typeof useToolbarIcon>;
  };
  searchRef: import("react").RefObject<SearchBarCommands | null>;
}) {
  const format = (value: string) =>
    value === "all" ? "All" : value.replaceAll("_", " ");

  return (
    <>
      <Stack.SearchBar
        ref={searchRef}
        obscureBackground={false}
        onCancelButtonPress={() => {
          toolbar.onSearchCancel();
          searchRef.current?.clearText();
        }}
        onChangeText={(event) => toolbar.onSearchChange(searchText(event))}
        placement="stacked"
        placeholder="Search feedback"
        textColor={theme.text}
        tintColor={theme.primary}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add feedback"
          icon={icons.add}
          onPress={toolbar.onNewFeedback}
          tintColor={theme.primary}
          variant="prominent"
        >
          New feedback
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          accessibilityLabel="Filters"
          icon={icons.filter}
          tintColor={theme.text}
          title="Filters"
        >
          <Stack.Toolbar.Menu
            accessibilityLabel="Kind"
            tintColor={theme.text}
            title="Kind"
          >
            {["all", "feedback", "feature_request", "bug_report"].map(
              (value) => (
                <Stack.Toolbar.MenuAction
                  isOn={toolbar.kind === value}
                  key={`kind-${value}`}
                  onPress={() =>
                    toolbar.onKindChange(value as InboxToolbarProps["kind"])
                  }
                >
                  {format(value)}
                </Stack.Toolbar.MenuAction>
              ),
            )}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            accessibilityLabel="Status"
            tintColor={theme.text}
            title="Status"
          >
            {[
              "all",
              "open",
              "under_review",
              "planned",
              "in_progress",
              "completed",
              "closed",
            ].map((value) => (
              <Stack.Toolbar.MenuAction
                isOn={toolbar.status === value}
                key={`status-${value}`}
                onPress={() =>
                  toolbar.onStatusChange(value as InboxToolbarProps["status"])
                }
              >
                {format(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu
            accessibilityLabel="Priority"
            tintColor={theme.text}
            title="Priority"
          >
            {["all", "high", "medium", "low"].map((value) => (
              <Stack.Toolbar.MenuAction
                isOn={toolbar.priority === value}
                key={`priority-${value}`}
                onPress={() =>
                  toolbar.onPriorityChange(
                    value as InboxToolbarProps["priority"],
                  )
                }
              >
                {format(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
