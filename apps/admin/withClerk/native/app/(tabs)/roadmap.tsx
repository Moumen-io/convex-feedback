import type { RoadmapItem, RoadmapStatus } from "convex-feedback";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { adminTheme } from "@/constants/AdminTheme";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";

const stages: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
];

export default function RoadmapScreen() {
  const roadmap = feedbackHooks.useRoadmap();
  const items = roadmap.results;
  const move = feedbackHooks.useMoveRoadmapItem();
  const moveAction = useAdminAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = items?.find((item) => item.id === selectedId);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Roadmap</Text>
          <Text style={styles.subtitle}>Move feedback into delivery</Text>
        </View>
        <View style={styles.headerActions}>
          {(roadmap.status === "CanLoadMore" ||
            roadmap.status === "LoadingMore") && (
            <Pressable
              disabled={roadmap.status === "LoadingMore"}
              style={[
                styles.secondaryButton,
                roadmap.status === "LoadingMore" && styles.disabled,
              ]}
              onPress={() => roadmap.loadMore(feedbackHooks.pageSizes.roadmap)}
            >
              {roadmap.status === "LoadingMore" ? (
                <ActivityIndicator color={adminTheme.primary} />
              ) : (
                <Text>More</Text>
              )}
            </Pressable>
          )}
          {roadmap.status === "LoadingMore" && (
            <ActivityIndicator color={adminTheme.primary} />
          )}
          <Pressable
            style={styles.primaryButton}
            onPress={() => setCreateOpen(true)}
          >
            <Text style={styles.primaryButtonText}>New item</Text>
          </Pressable>
        </View>
      </View>
      {roadmap.status === "LoadingFirstPage" ? (
        <ActivityIndicator style={styles.loader} color={adminTheme.primary} />
      ) : (
        <ScrollView
          horizontal
          pagingEnabled={false}
          contentContainerStyle={styles.board}
        >
          {stages.map((stage, stageIndex) => {
            const stageItems =
              items
                ?.filter((item) => item.status === stage.value)
                .sort((a, b) => a.position - b.position) ?? [];
            return (
              <View key={stage.value} style={styles.column}>
                <View style={styles.columnHeader}>
                  <Text style={styles.columnTitle}>{stage.label}</Text>
                  <Text style={styles.count}>{stageItems.length}</Text>
                </View>
                <FlatList
                  data={stageItems}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.cards}
                  ListEmptyComponent={
                    <Text style={styles.empty}>No items in this stage.</Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.card}
                      onPress={() => setSelectedId(item.id)}
                    >
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      {!!item.description && (
                        <Text style={styles.cardBody} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      <View style={styles.cardFooter}>
                        <Text style={styles.feedbackCount}>
                          {item.feedbackCount} linked
                        </Text>
                        <View style={styles.actions}>
                          {stageIndex > 0 && (
                            <MoveButton
                              label="←"
                              disabled={moveAction.pending}
                              onPress={() =>
                                void moveAction.run(
                                  () =>
                                    move({
                                      roadmapId: item.id,
                                      status: stages[stageIndex - 1]!.value,
                                    }),
                                  "Could not move roadmap item",
                                )
                              }
                            />
                          )}
                          {stageIndex < stages.length - 1 && (
                            <MoveButton
                              label="→"
                              disabled={moveAction.pending}
                              onPress={() =>
                                void moveAction.run(
                                  () =>
                                    move({
                                      roadmapId: item.id,
                                      status: stages[stageIndex + 1]!.value,
                                    }),
                                  "Could not move roadmap item",
                                )
                              }
                            />
                          )}
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
      <RoadmapForm visible={createOpen} onClose={() => setCreateOpen(false)} />
      <RoadmapDetail item={selected} onClose={() => setSelectedId(undefined)} />
    </View>
  );
}

function MoveButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.moveButton, disabled && styles.disabled]}
    >
      <Text style={styles.moveText}>{label}</Text>
    </Pressable>
  );
}

function RoadmapForm({
  visible,
  onClose,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  item?: RoadmapItem;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const create = feedbackHooks.useCreateRoadmap();
  const update = feedbackHooks.useUpdateRoadmap();
  const action = useAdminAction();

  useEffect(() => {
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
  }, [item?.description, item?.id, item?.title, visible]);

  const save = async () => {
    const succeeded = await action.run(
      () =>
        item
          ? update({
              roadmapId: item.id,
              title,
              description: description || undefined,
            })
          : create({
              title,
              description: description || undefined,
              status: "planned",
            }),
      "Could not save roadmap item",
    );
    if (succeeded) {
      onClose();
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !action.pending && onClose()}
    >
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>
          {item ? "Edit roadmap item" : "New roadmap item"}
        </Text>
        <TextInput
          style={styles.input}
          editable={!action.pending}
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={adminTheme.muted}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          editable={!action.pending}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={adminTheme.muted}
          multiline
        />
        <View style={styles.modalActions}>
          <Pressable
            disabled={action.pending}
            style={[styles.secondaryButton, action.pending && styles.disabled]}
            onPress={onClose}
          >
            <Text>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={!title.trim() || action.pending}
            style={[styles.primaryButton, action.pending && styles.disabled]}
            onPress={() => void save()}
          >
            <Text style={styles.primaryButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RoadmapDetail({
  item,
  onClose,
}: {
  item?: RoadmapItem;
  onClose: () => void;
}) {
  const feedback = feedbackHooks.useRoadmapFeedback(item?.id);
  const detach = feedbackHooks.useDetachFeedbackFromRoadmap();
  const remove = feedbackHooks.useDeleteRoadmap();
  const detachAction = useAdminAction();
  const deleteAction = useAdminAction();
  const [editing, setEditing] = useState(false);
  if (!item) return null;

  const deleteItem = async () => {
    const succeeded = await deleteAction.run(
      () => remove({ roadmapId: item.id }),
      "Could not delete roadmap item",
    );
    if (succeeded) {
      onClose();
    }
  };

  const confirmDelete = () => {
    if (deleteAction.pending) return;
    Alert.alert(
      "Delete roadmap item?",
      "This permanently deletes the roadmap item and detaches all linked feedback.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteItem(),
        },
      ],
    );
  };

  return (
    <>
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          !detachAction.pending && !deleteAction.pending && onClose()
        }
      >
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>
            {item.description || "No description"}
          </Text>
          <Text style={styles.columnTitle}>Attached feedback</Text>
          <FlatList
            data={feedback.results}
            onEndReached={() => {
              if (feedback.status === "CanLoadMore") {
                feedback.loadMore(feedbackHooks.pageSizes.entries);
              }
            }}
            onEndReachedThreshold={0.4}
            keyExtractor={(entry) => entry.id}
            ListEmptyComponent={
              feedback.status === "Exhausted" ? (
                <Text style={styles.empty}>No feedback attached.</Text>
              ) : null
            }
            ListFooterComponent={
              feedback.status === "LoadingMore" ? (
                <ActivityIndicator
                  style={styles.pageLoader}
                  color={adminTheme.primary}
                />
              ) : null
            }
            renderItem={({ item: entry }) => (
              <View style={styles.feedbackRow}>
                <Text numberOfLines={1} style={styles.feedbackTitle}>
                  {entry.title}
                </Text>
                <Pressable
                  disabled={detachAction.pending}
                  style={detachAction.pending && styles.disabled}
                  onPress={() =>
                    void detachAction.run(
                      () => detach({ entryId: entry.id }),
                      "Could not detach feedback",
                    )
                  }
                >
                  <Text style={styles.danger}>Detach</Text>
                </Pressable>
              </View>
            )}
          />
          <View style={styles.modalActions}>
            <Pressable
              disabled={detachAction.pending || deleteAction.pending}
              style={[
                styles.secondaryButton,
                (detachAction.pending || deleteAction.pending) &&
                  styles.disabled,
              ]}
              onPress={onClose}
            >
              <Text>Close</Text>
            </Pressable>
            <Pressable
              disabled={detachAction.pending || deleteAction.pending}
              style={[
                styles.secondaryButton,
                (detachAction.pending || deleteAction.pending) &&
                  styles.disabled,
              ]}
              onPress={() => setEditing(true)}
            >
              <Text>Edit</Text>
            </Pressable>
            <Pressable
              disabled={deleteAction.pending || detachAction.pending}
              style={[
                styles.dangerButton,
                (deleteAction.pending || detachAction.pending) &&
                  styles.disabled,
              ]}
              onPress={confirmDelete}
            >
              <Text style={styles.dangerText}>
                {deleteAction.pending ? "Deleting…" : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <RoadmapForm
        visible={editing}
        onClose={() => setEditing(false)}
        item={item}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminTheme.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  loader: { flex: 1 },
  pageLoader: { paddingVertical: 16 },
  disabled: { opacity: 0.5 },
  title: { color: adminTheme.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: adminTheme.muted, fontSize: 14 },
  board: { gap: 12, paddingHorizontal: 12, paddingBottom: 120 },
  column: {
    width: 310,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 16,
    backgroundColor: adminTheme.surface,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: adminTheme.border,
    padding: 14,
  },
  columnTitle: { color: adminTheme.text, fontSize: 14, fontWeight: "700" },
  count: { color: adminTheme.muted, fontSize: 12 },
  cards: { gap: 10, padding: 10 },
  card: {
    gap: 8,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    padding: 13,
  },
  cardTitle: { color: adminTheme.text, fontSize: 15, fontWeight: "600" },
  cardBody: { color: adminTheme.muted, fontSize: 14, lineHeight: 20 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedbackCount: { color: adminTheme.muted, fontSize: 12 },
  actions: { flexDirection: "row", gap: 6 },
  moveButton: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: adminTheme.primarySoft,
  },
  moveText: { color: adminTheme.primary, fontWeight: "700" },
  empty: { color: adminTheme.muted, padding: 18, textAlign: "center" },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: adminTheme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 10,
    backgroundColor: adminTheme.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: adminTheme.danger,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dangerText: { color: "#FFFFFF", fontWeight: "700" },
  modal: {
    flex: 1,
    gap: 16,
    backgroundColor: adminTheme.background,
    padding: 22,
    paddingTop: 40,
  },
  modalTitle: { color: adminTheme.text, fontSize: 24, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: adminTheme.border,
    borderRadius: 12,
    backgroundColor: adminTheme.surface,
    color: adminTheme.text,
    padding: 13,
  },
  multiline: { minHeight: 120, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: adminTheme.border,
    paddingVertical: 12,
  },
  feedbackTitle: { flex: 1, color: adminTheme.text },
  danger: { color: adminTheme.danger, fontWeight: "600" },
});
