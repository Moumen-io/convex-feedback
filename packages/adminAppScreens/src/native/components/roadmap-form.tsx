import type { RoadmapItem } from "convex-feedback";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAdminTheme, type AdminTheme } from "../theme.js";
import { useAdminAction } from "../lib/action.js";
import { feedbackHooks } from "../lib/feedback.js";

export interface RoadmapFormToolbarProps {
  isEdit: boolean;
  pending: boolean;
  title: string;
  save: () => void;
  onClose: () => void;
}

export interface RoadmapFormProps {
  item?: RoadmapItem;
  onClose: () => void;
  renderToolbar?: (props: RoadmapFormToolbarProps) => ReactNode;
}

export function RoadmapForm({
  item,
  onClose,
  renderToolbar,
}: RoadmapFormProps) {
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const isEdit = item !== undefined;
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const create = feedbackHooks.useCreateRoadmap();
  const update = feedbackHooks.useUpdateRoadmap();
  const action = useAdminAction();
  useEffect(() => {
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
  }, [item?.description, item?.id, item?.title]);

  const save = async () => {
    const succeeded = await action.run(
      () =>
        item
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
        placeholderTextColor={theme.muted}
        style={styles.input}
        returnKeyType="next"
      />
      <Text style={styles.label}>Description</Text>
      <TextInput
        editable={!action.pending}
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        placeholderTextColor={theme.muted}
        style={[styles.input, styles.multiline]}
        multiline
        textAlignVertical="top"
      />
    </ScrollView>
  );

  return (
    <>
      {renderToolbar?.({
        isEdit,
        onClose,
        pending: action.pending,
        save: () => void save(),
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
    content: { gap: 10, paddingTop: 22 },
    description: {
      marginBottom: 8,
      color: theme.muted,
      fontSize: 14,
      lineHeight: 21,
    },
    label: { color: theme.text, fontSize: 13, fontWeight: "600" },
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
