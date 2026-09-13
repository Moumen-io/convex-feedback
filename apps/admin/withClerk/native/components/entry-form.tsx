import type { AdminFeedbackEntry, EntryKind } from "convex-feedback";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { adminTheme } from "@/constants/AdminTheme";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";
import { useToolbarIcon } from "@/lib/native-toolbar";

const kinds: { value: EntryKind; label: string }[] = [
  { value: "feedback", label: "Feedback" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug_report", label: "Bug report" },
];

export function EntryForm({ entry }: { entry?: AdminFeedbackEntry }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEdit = entry !== undefined;
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? "feedback");
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const create = feedbackHooks.useCreateEntry();
  const update = feedbackHooks.useUpdateEntry();
  const action = useAdminAction();
  const closeIcon = useToolbarIcon("xmark", "close");
  const kindIcon = useToolbarIcon("tag", "label");
  const saveIcon = useToolbarIcon("checkmark", "check");

  useEffect(() => {
    setKind(entry?.kind ?? "feedback");
    setTitle(entry?.title ?? "");
    setBody(entry?.body ?? "");
  }, [entry?.body, entry?.id, entry?.kind, entry?.title]);

  const save = async () => {
    const succeeded = await action.run(
      () =>
        isEdit
          ? update({
              entryId: entry.id,
              kind,
              title: title.trim(),
              body: body.trim(),
            })
          : create({ kind, title: title.trim(), body: body.trim() }),
      isEdit ? "Could not update feedback" : "Could not create feedback",
    );
    if (succeeded) router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{ title: isEdit ? "Edit feedback" : "New feedback" }}
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
        <Stack.Toolbar.Menu
          icon={kindIcon}
          title="Kind"
          accessibilityLabel="Change feedback kind"
          disabled={action.pending}
          tintColor={adminTheme.text}
        >
          {kinds.map(({ value, label }) => (
            <Stack.Toolbar.MenuAction
              key={value}
              isOn={kind === value}
              disabled={action.pending}
              onPress={() => setKind(value)}
            >
              {label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          icon={saveIcon}
          variant="done"
          accessibilityLabel={isEdit ? "Save changes" : "Create feedback"}
          disabled={!title.trim() || !body.trim() || action.pending}
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
            paddingLeft: 22 + insets.left,
            paddingRight: 22 + insets.right,
            paddingBottom: 32,
          },
        ]}
      >
        <Text style={styles.description}>
          {isEdit
            ? "Update the entry details, including its category."
            : "Capture a new customer signal for the inbox."}
        </Text>
        <View style={styles.field}>
          <Text style={styles.label}>Kind</Text>
          <Text style={styles.value}>
            {kinds.find((option) => option.value === kind)?.label}
          </Text>
          <Text style={styles.hint}>Change it from the native Kind menu.</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            autoFocus={!isEdit}
            editable={!action.pending}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={adminTheme.muted}
            style={styles.input}
            returnKeyType="next"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            editable={!action.pending}
            value={body}
            onChangeText={setBody}
            placeholder="Description"
            placeholderTextColor={adminTheme.muted}
            style={[styles.input, styles.multiline]}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  scroll: { flex: 1 },
  content: { gap: 18, paddingTop: 22 },
  description: { color: adminTheme.muted, fontSize: 14, lineHeight: 21 },
  field: { gap: 7 },
  label: { color: adminTheme.text, fontSize: 13, fontWeight: "600" },
  value: { color: adminTheme.text, fontSize: 15 },
  hint: { color: adminTheme.muted, fontSize: 12 },
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
