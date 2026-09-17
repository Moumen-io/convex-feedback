import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { RoadmapForm } from "../components/roadmap-form.js";
import type { RoadmapFormToolbarProps } from "../components/roadmap-form.js";
import { feedbackHooks } from "../lib/feedback.js";
import { useAdminTheme, type AdminTheme } from "../theme.js";
import type { RoadmapItem } from "convex-feedback";

export interface EditRoadmapScreenProps {
  roadmapId: string;
  routeItem?: RoadmapItem;
  onClose: () => void;
  renderToolbar?: (props: RoadmapFormToolbarProps) => ReactNode;
}

export function EditRoadmapScreen({
  roadmapId,
  routeItem,
  onClose,
  renderToolbar,
}: EditRoadmapScreenProps) {
  const roadmap = feedbackHooks.useRoadmap();
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const item =
    roadmap.results.find((candidate) => candidate.id === roadmapId) ??
    routeItem;

  if (!item) {
    return (
      <View style={styles.center}>
        {roadmap.status === "LoadingFirstPage" ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            <Text style={styles.text}>Roadmap item not found.</Text>
            <Text style={styles.close} onPress={onClose}>
              Close
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <RoadmapForm item={item} onClose={onClose} renderToolbar={renderToolbar} />
  );
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    center: {
      alignItems: "center",
      backgroundColor: theme.background,
      flex: 1,
      gap: 12,
      justifyContent: "center",
    },
    text: { color: theme.text },
    close: { color: theme.primary, fontWeight: "600" },
  });
}
