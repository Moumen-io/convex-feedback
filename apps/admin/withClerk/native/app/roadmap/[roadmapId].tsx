import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";
import { useAdminAction } from "@/lib/action";
import { feedbackHooks } from "@/lib/feedback";
import { useToolbarIcon } from "@/lib/native-toolbar";
import { parseRoadmapRouteItem, roadmapRouteParams } from "@/lib/roadmap-route";

function displayValue(value: string): string {
  return value.replaceAll("_", " ");
}

export default function RoadmapDetailScreen() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const roadmap = feedbackHooks.useRoadmap();
  const routeItem = parseRoadmapRouteItem(params.item);
  const item =
    roadmap.results.find((candidate) => candidate.id === params.roadmapId) ??
    routeItem;
  const feedback = feedbackHooks.useRoadmapFeedback(item?.id);
  const detach = feedbackHooks.useDetachFeedbackFromRoadmap();
  const remove = feedbackHooks.useDeleteRoadmap();
  const detachAction = useAdminAction();
  const deleteAction = useAdminAction();
  const closeIcon = useToolbarIcon("xmark", "close");
  const editIcon = useToolbarIcon("pencil", "edit");
  const actionsIcon = useToolbarIcon("ellipsis.circle", "more_vert");

  const deleteItem = async () => {
    if (!item) return;
    const succeeded = await deleteAction.run(
      () => remove({ roadmapId: item.id }),
      "Could not delete roadmap item",
    );
    if (succeeded) router.back();
  };

  const confirmDelete = () => {
    if (!item || deleteAction.pending || detachAction.pending) return;
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

  if (!item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Roadmap item" }} />
        {roadmap.status === "LoadingFirstPage" ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <Text style={styles.body}>Roadmap item not found.</Text>
        )}
      </View>
    );
  }

  return (
    <View collapsable={false} style={styles.screen}>
      <Stack.Screen options={{ title: item.title }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={closeIcon}
          accessibilityLabel="Close roadmap details"
          onPress={() => router.back()}
          tintColor={theme.text}
        >
          Close
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={editIcon}
          accessibilityLabel="Edit roadmap item"
          disabled={deleteAction.pending || detachAction.pending}
          onPress={() =>
            router.push({
              pathname: "/roadmap/[roadmapId]/edit",
              params: roadmapRouteParams(item),
            })
          }
          tintColor={theme.primary}
        >
          Edit
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          icon={actionsIcon}
          title="Actions"
          accessibilityLabel="Roadmap actions"
          disabled={deleteAction.pending || detachAction.pending}
          tintColor={theme.text}
        >
          <Stack.Toolbar.MenuAction
            destructive
            disabled={deleteAction.pending || detachAction.pending}
            onPress={confirmDelete}
          >
            Delete roadmap item
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ScrollView
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: 20 + insets.left,
            paddingRight: 20 + insets.right,
            paddingBottom: 20,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{displayValue(item.status)}</Text>
          </View>
          <Text style={styles.description}>
            {item.description || "No description"}
          </Text>
          <Text style={styles.sectionTitle}>Attached feedback</Text>
        </View>
        {feedback.status === "LoadingFirstPage" ? (
          <ActivityIndicator color={theme.primary} />
        ) : feedback.results.length === 0 ? (
          <Text style={styles.empty}>No feedback attached.</Text>
        ) : (
          feedback.results.map((entry) => (
            <View key={entry.id} style={styles.feedbackRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.feedbackLink,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/feedback/[entryId]",
                    params: { entryId: entry.id },
                  })
                }
              >
                <Text numberOfLines={1} style={styles.feedbackTitle}>
                  {entry.title}
                </Text>
                <Text style={styles.feedbackMeta}>
                  {displayValue(entry.status)}
                </Text>
              </Pressable>
              <Pressable
                disabled={detachAction.pending || deleteAction.pending}
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
          ))
        )}
        {feedback.status === "CanLoadMore" && (
          <Pressable
            style={styles.loadMore}
            onPress={() => feedback.loadMore(feedbackHooks.pageSizes.entries)}
          >
            <Text style={styles.loadMoreText}>Load more feedback</Text>
          </Pressable>
        )}
        {feedback.status === "LoadingMore" && (
          <ActivityIndicator style={styles.pageLoader} color={theme.primary} />
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    list: { flex: 1 },
    content: { flexGrow: 1, gap: 8, paddingTop: 20 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    body: { color: theme.muted },
    headerContent: { gap: 12, paddingBottom: 8 },
    statusBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      backgroundColor: theme.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    description: { color: theme.muted, fontSize: 15, lineHeight: 23 },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: "700" },
    pageLoader: { paddingVertical: 16 },
    empty: { color: theme.muted, paddingVertical: 18, textAlign: "center" },
    loadMore: { alignItems: "center", paddingVertical: 16 },
    loadMoreText: { color: theme.primary, fontWeight: "600" },
    feedbackRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      paddingVertical: 12,
    },
    feedbackLink: { flex: 1, gap: 4 },
    pressed: { opacity: 0.7 },
    feedbackTitle: { color: theme.text, fontSize: 14 },
    feedbackMeta: {
      color: theme.muted,
      fontSize: 11,
      textTransform: "capitalize",
    },
    disabled: { opacity: 0.5 },
    danger: { color: theme.danger, fontWeight: "600" },
  });
}
