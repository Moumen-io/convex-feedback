import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { RoadmapForm } from "@/components/roadmap-form";
import { adminTheme } from "@/constants/AdminTheme";
import { feedbackHooks } from "@/lib/feedback";
import { parseRoadmapRouteItem } from "@/lib/roadmap-route";

export default function EditRoadmapScreen() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  const roadmap = feedbackHooks.useRoadmap();
  const routeItem = parseRoadmapRouteItem(params.item);
  const item =
    roadmap.results.find((candidate) => candidate.id === params.roadmapId) ??
    routeItem;

  if (!item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Edit roadmap item" }} />
        {roadmap.status === "LoadingFirstPage" ? (
          <ActivityIndicator color={adminTheme.primary} />
        ) : (
          <>
            <Text style={styles.text}>Roadmap item not found.</Text>
            <Text style={styles.close} onPress={() => router.back()}>
              Close
            </Text>
          </>
        )}
      </View>
    );
  }

  return <RoadmapForm item={item} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: adminTheme.background,
  },
  text: { color: adminTheme.text },
  close: { color: adminTheme.primary, fontWeight: "600" },
});
