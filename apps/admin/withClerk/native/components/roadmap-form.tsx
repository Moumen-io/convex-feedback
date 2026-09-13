import type { RoadmapItem } from "convex-feedback";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { adminTheme } from "@/constants/AdminTheme";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";
import { useToolbarIcon } from "@/lib/native-toolbar";

export function RoadmapForm({ item }: { item?: RoadmapItem }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEdit = item !== undefined;
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const create = feedbackHooks.useCreateRoadmap();
  const update = feedbackHooks.useUpdateRoadmap();
  const action = useAdminAction();
  const closeIcon = useToolbarIcon("xmark", "close");
  const saveIcon = useToolbarIcon("checkmark", "check");

  useEffect(() => {
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
  }, [item?.description, item?.id, item?.title]);

  const save = async () => {
    const succeeded = await action.run(
      () =>
        isEdit
          ? update({
              roadmapId: item.id,
              title: title.trim(),
              description: description.trim() || undefined,
            })
          : create({
              title: title.trim(),
              description: description.trim() || undefined,
              status: "planned",
            }),
      isEdit
        ? "Could not update roadmap item"
        : "Could not create roadmap item",
    );
    if (succeeded) router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{ title: isEdit ? "Edit roadmap item" : "New roadmap item" }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={closeIcon}
          accessibilityLabel="Cancel"
          disabled={action.pending}
          onPress={() => router.back()}
          tintColor={adminTheme.text}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={saveIcon}
          variant="done"
          accessibilityLabel={isEdit ? "Save changes" : "Create roadmap item"}
          disabled={!title.trim() || action.pending}
          onPress={() => void save()}
          tintColor={adminTheme.primary}
        >
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: 16 + insets.left,
            paddingRight: 16 + insets.right,
            paddingBottom: 16,
          },
        ]}
      >
        <Text style={styles.description}>
          {isEdit
            ? "Update the roadmap item details."
            : "Create a deliverable for the roadmap."}
        </Text>
        <Text style={styles.label}>Title</Text>
        <TextInput
          autoFocus
          editable={!action.pending}
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={adminTheme.muted}
          style={styles.input}
          returnKeyType="next"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          editable={!action.pending}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={adminTheme.muted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  scroll: { flex: 1 },
  content: { gap: 10, paddingTop: 22 },
  description: {
    marginBottom: 8,
    color: adminTheme.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  label: { color: adminTheme.text, fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    color: adminTheme.text,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
  },
  multiline: { minHeight: 150 },
});
