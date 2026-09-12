import type { FeedbackTag } from "convex-feedback";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { adminTheme } from "@/constants/AdminTheme";
import { feedbackHooks } from "@/lib/feedback";
import { useTags } from "@/providers/tags-provider";

export default function TagsScreen() {
  const tags = useTags();
  const create = feedbackHooks.useCreateTag();
  const [name, setName] = useState("");
  const add = async () => {
    try {
      await create({ name, color: "#39745B" });
      setName("");
    } catch (error) {
      Alert.alert(
        "Could not create tag",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Tags</Text>
        <Text style={styles.subtitle}>Internal feedback taxonomy</Text>
      </View>
      <View style={styles.composer}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New tag name"
          placeholderTextColor={adminTheme.muted}
          style={styles.input}
        />
        <Pressable
          disabled={!name.trim()}
          style={styles.add}
          onPress={() => void add()}
        >
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={tags ?? []}
        keyExtractor={(tag) => tag.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No tags yet.</Text>}
        renderItem={({ item }) => <TagRow tag={item} />}
      />
    </View>
  );
}

function TagRow({ tag }: { tag: FeedbackTag }) {
  const update = feedbackHooks.useUpdateTag();
  const remove = feedbackHooks.useDeleteTag();
  const [name, setName] = useState(tag.name);
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          { backgroundColor: tag.color ?? adminTheme.primary },
        ]}
      />
      <TextInput value={name} onChangeText={setName} style={styles.rowInput} />
      {name.trim() !== tag.name && (
        <Pressable
          onPress={() => void update({ tagId: tag.id, name, color: tag.color })}
        >
          <Text style={styles.action}>Save</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete tag?",
            "It will be detached from every feedback entry.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => void remove({ tagId: tag.id }),
              },
            ],
          )
        }
      >
        <Text style={styles.delete}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  header: { gap: 4, padding: 18 },
  title: { color: adminTheme.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: adminTheme.muted, fontSize: 14 },
  composer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    color: adminTheme.text,
    paddingHorizontal: 13,
  },
  add: {
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: adminTheme.primary,
    paddingHorizontal: 18,
  },
  addText: { color: "#FFFFFF", fontWeight: "700" },
  list: { paddingHorizontal: 18, paddingBottom: 120 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: adminTheme.border,
    paddingVertical: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowInput: {
    flex: 1,
    color: adminTheme.text,
    fontSize: 15,
    paddingVertical: 8,
  },
  action: { color: adminTheme.primary, fontWeight: "700" },
  delete: { color: adminTheme.danger, fontWeight: "600" },
  empty: { color: adminTheme.muted, padding: 30, textAlign: "center" },
});
