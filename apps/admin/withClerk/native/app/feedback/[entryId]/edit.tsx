import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";
import { EntryForm } from "@/components/entry-form";
import { feedbackHooks } from "@/lib/feedback";

export default function EditFeedbackScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const router = useRouter();
  const entry = feedbackHooks.useAdminEntry(entryId);
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  if (entry === undefined) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Edit feedback" }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (entry === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Edit feedback" }} />
        <Text style={styles.text}>Feedback not found.</Text>
        <Text style={styles.close} onPress={() => router.back()}>
          Close
        </Text>
      </View>
    );
  }

  return <EntryForm entry={entry} />;
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
