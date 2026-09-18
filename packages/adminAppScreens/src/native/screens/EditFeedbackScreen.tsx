import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { EntryForm } from "../components/entry-form.js";
import { useAdminTheme, type AdminTheme } from "../theme.js";
import { useAdminFeedbackHooks } from "../lib/feedback.js";

export interface EditFeedbackScreenProps {
  entryId: string;
  onClose: () => void;
}

export function EditFeedbackScreen({
  entryId,
  onClose,
}: EditFeedbackScreenProps) {
  const feedbackHooks = useAdminFeedbackHooks();
  const entry = feedbackHooks.useAdminEntry(entryId);
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  if (entry === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (entry === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Feedback not found.</Text>
        <Text style={styles.close} onPress={onClose}>
          Close
        </Text>
      </View>
    );
  }

  return <EntryForm entry={entry} onClose={onClose} />;
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
