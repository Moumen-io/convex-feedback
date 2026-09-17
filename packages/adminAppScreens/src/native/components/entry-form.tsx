import type { AdminFeedbackEntry, EntryKind } from "convex-feedback";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAdminTheme, type AdminTheme } from "../theme.js";
import { useAdminAction } from "../lib/action.js";
import { feedbackHooks } from "../lib/feedback.js";

const kinds: { value: EntryKind; label: string }[] = [
  { value: "feedback", label: "Feedback" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug_report", label: "Bug report" },
];

export interface EntryFormToolbarProps {
  isEdit: boolean;
  pending: boolean;
  kind: EntryKind;
  setKind: (kind: EntryKind) => void;
  title: string;
  body: string;
  save: () => void;
  onClose: () => void;
}

export interface EntryFormProps {
  entry?: AdminFeedbackEntry;
  onClose: () => void;
  renderToolbar?: (props: EntryFormToolbarProps) => ReactNode;
}

export function EntryForm({ entry, onClose, renderToolbar }: EntryFormProps) {
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const isEdit = entry !== undefined;
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? "feedback");
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const create = feedbackHooks.useCreateEntry();
  const update = feedbackHooks.useUpdateEntry();
  const action = useAdminAction();
  useEffect(() => {
    setKind(entry?.kind ?? "feedback");
    setTitle(entry?.title ?? "");
    setBody(entry?.body ?? "");
  }, [entry?.body, entry?.id, entry?.kind, entry?.title]);

  const save = async () => {
    const succeeded = await action.run(
      () =>
        entry
          ? update({
              entryId: entry.id,
              kind,
              title: title.trim(),
              body: body.trim(),
            })
          : create({ kind, title: title.trim(), body: body.trim() }),
      isEdit ? "Could not update feedback" : "Could not create feedback",
    );
    if (succeeded) onClose();
  };

  const formContent = (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
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
          placeholderTextColor={theme.muted}
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
          placeholderTextColor={theme.muted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  return (
    <>
      {renderToolbar?.({
        body,
        isEdit,
        kind,
        onClose,
        pending: action.pending,
        save: () => void save(),
        setKind,
        title,
      })}
      {Platform.OS === "ios" ? (
        formContent
      ) : (
        <KeyboardAvoidingView style={styles.screen} behavior="height">
          {formContent}
        </KeyboardAvoidingView>
      )}
    </>
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1, backgroundColor: theme.background },
    content: { gap: 18, paddingTop: 22 },
    description: { color: theme.muted, fontSize: 14, lineHeight: 21 },
    field: { gap: 7 },
    label: { color: theme.text, fontSize: 13, fontWeight: "600" },
    value: { color: theme.text, fontSize: 15 },
    hint: { color: theme.muted, fontSize: 12 },
    input: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.input,
      color: theme.text,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 15,
    },
    multiline: { minHeight: 150, maxHeight: 180 },
  });
}
