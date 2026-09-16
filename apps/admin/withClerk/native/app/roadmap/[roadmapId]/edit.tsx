import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { RoadmapForm } from "@/components/roadmap-form";
import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";
import { feedbackHooks } from "@/lib/feedback";
import { parseRoadmapRouteItem } from "@/lib/roadmap-route";

export default function EditRoadmapScreen() {
  const params = useLocalSearchParams<{
    roadmapId: string;
    item?: string | string[];
  }>();
  const router = useRouter();
  const roadmap = feedbackHooks.useRoadmap();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const routeItem = parseRoadmapRouteItem(params.item);
  const item =
    roadmap.results.find((candidate) => candidate.id === params.roadmapId) ??
    routeItem;

  if (!item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Edit roadmap item" }} />
        {roadmap.status === "LoadingFirstPage" ? (
          <ActivityIndicator color={theme.primary} />
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

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: theme.background,
    },
    text: { color: theme.text },
    close: { color: theme.primary, fontWeight: "600" },
  });
}
