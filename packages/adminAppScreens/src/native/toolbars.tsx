import type { EntryPriority, EntryStatus } from "convex-feedback";
import { Stack } from "expo-router";
import {
  unstable_getMaterialSymbolSourceAsync,
  type AndroidSymbol,
} from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ImageSourcePropType } from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import type { SFSymbol } from "sf-symbols-typescript";

import type { EntryFormToolbarProps } from "./components/entry-form.js";
import type { RoadmapFormToolbarProps } from "./components/roadmap-form.js";
import type { FeedbackDetailToolbarProps } from "./screens/FeedbackDetailScreen.js";
import type { InboxToolbarProps } from "./screens/InboxScreen.js";
import type { RoadmapDetailToolbarProps } from "./screens/RoadmapDetailScreen.js";
import type { RoadmapToolbarProps } from "./screens/RoadmapScreen.js";
import { useAdminTheme } from "./theme.js";

/**
 * Resolves the platform-native icon shape expected by Expo Router toolbars.
 * Android needs a material-symbol image source while iOS uses an SF Symbol.
 */
export function useToolbarIcon(
  ios: SFSymbol,
  android: AndroidSymbol,
): SFSymbol | ImageSourcePropType | undefined {
  const theme = useAdminTheme();
  const [androidSource, setAndroidSource] =
    useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    if (process.env.EXPO_OS === "ios") return;

    let active = true;
    void unstable_getMaterialSymbolSourceAsync(android, 24, theme.text).then(
      (source) => {
        if (active) setAndroidSource(source);
      },
    );

    return () => {
      active = false;
    };
  }, [android, theme.text]);

  return process.env.EXPO_OS === "ios" ? ios : (androidSource ?? undefined);
}

export function InboxToolbar({ toolbar }: { toolbar: InboxToolbarProps }) {
  const theme = useAdminTheme();
  const searchRef = useRef<SearchBarCommands>(null);
  const addIcon = useToolbarIcon("plus", "add");
  const filterIcon = useToolbarIcon(
    "line.3.horizontal.decrease",
    "filter_list",
  );

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
          icon={addIcon}
          onPress={toolbar.onNewFeedback}
          tintColor={theme.primary}
          variant="prominent"
        >
          New feedback
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          accessibilityLabel="Filters"
          icon={filterIcon}
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
                  {formatFilterValue(value)}
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
                {formatFilterValue(value)}
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
                {formatFilterValue(value)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}

export function RoadmapToolbar({ toolbar }: { toolbar: RoadmapToolbarProps }) {
  const theme = useAdminTheme();
  const addIcon = useToolbarIcon("plus", "add");

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
        icon={addIcon}
        onPress={toolbar.onNewItem}
        tintColor={theme.primary}
        variant="prominent"
      >
        New item
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

export function EntryFormToolbar(props: EntryFormToolbarProps) {
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const kindIcon = useToolbarIcon("tag", "label");
  const saveIcon = useToolbarIcon("checkmark", "check");
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
          icon={closeIcon}
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
          icon={kindIcon}
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
          icon={saveIcon}
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

export function RoadmapFormToolbar(props: RoadmapFormToolbarProps) {
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const saveIcon = useToolbarIcon("checkmark", "check");

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
          icon={closeIcon}
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
          icon={saveIcon}
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

export function FeedbackToolbar({
  toolbar,
}: {
  toolbar: FeedbackDetailToolbarProps;
}) {
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const statusIcon = useToolbarIcon("checkmark.circle", "check_circle");
  const priorityIcon = useToolbarIcon("flag", "flag");
  const metadataIcon = useToolbarIcon("info.circle", "info");
  const editIcon = useToolbarIcon("pencil", "edit");
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
          icon={closeIcon}
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
            icon={editIcon}
            onPress={() => toolbar.onEdit(entry.id)}
            tintColor={theme.primary}
          >
            Edit
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Spacer hidden={Platform.OS !== "ios"} />
          <Stack.Toolbar.Menu
            accessibilityLabel="Change status"
            disabled={toolbar.pending}
            icon={statusIcon}
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
            icon={priorityIcon}
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
            icon={metadataIcon}
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

export function RoadmapDetailToolbar({
  toolbar,
}: {
  toolbar: RoadmapDetailToolbarProps;
}) {
  const theme = useAdminTheme();
  const closeIcon = useToolbarIcon("xmark", "close");
  const editIcon = useToolbarIcon("pencil", "edit");
  const actionsIcon = useToolbarIcon("ellipsis.circle", "more_vert");

  return (
    <>
      <Stack.Screen options={{ title: toolbar.item.title }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Close roadmap details"
          icon={closeIcon}
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
          icon={editIcon}
          onPress={() => toolbar.onEdit(toolbar.item)}
          tintColor={theme.primary}
        >
          Edit
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          accessibilityLabel="Roadmap actions"
          disabled={toolbar.pending}
          icon={actionsIcon}
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

function formatFilterValue(value: string): string {
  return value === "all" ? "All" : value.replaceAll("_", " ");
}

function searchText(event: unknown): string {
  const value = event as { nativeEvent?: { text?: unknown } };
  return typeof value.nativeEvent?.text === "string"
    ? value.nativeEvent.text
    : "";
}
