import type { FeedbackMetadata, FeedbackMetadataValue } from "convex-feedback";
import { Code2, Database, Info, Monitor, X } from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";

function formatMetadataKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return words.length === 0
    ? key
    : words.charAt(0).toLocaleUpperCase("en-US") + words.slice(1);
}

function formatMetadataValue(value: FeedbackMetadataValue): string {
  return typeof value === "string" ? value : String(value);
}

function metadataValueType(value: FeedbackMetadataValue): string {
  return typeof value === "number" ? "number" : typeof value;
}

export function MetadataModal({
  metadata,
  entryTitle,
  visible,
  onClose,
}: {
  metadata: FeedbackMetadata;
  entryTitle: string;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const sections = [
    {
      key: "standard",
      label: "Standard diagnostics",
      description: "Platform and device context collected by the feedback UI.",
      Icon: Monitor,
      values: metadata.standard,
    },
    {
      key: "additional",
      label: "Additional context",
      description: "Application-provided values attached at submission time.",
      Icon: Code2,
      values: metadata.additional,
    },
  ] as const;
  const populatedSections = sections.filter(
    (section) =>
      section.values !== undefined && Object.keys(section.values).length > 0,
  );
  const valueCount = populatedSections.reduce(
    (count, section) => count + Object.keys(section.values ?? {}).length,
    0,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafeArea} edges={modalEdges}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeading}>
            <View style={styles.modalIcon}>
              <Database color={theme.primary} size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.modalHeadingCopy}>
              <Text style={styles.modalTitle}>Diagnostic metadata</Text>
              <Text numberOfLines={2} style={styles.modalSubtitle}>
                Context captured with “{entryTitle}”.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close metadata"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <X color={theme.text} size={20} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Info color={theme.primary} size={17} />
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Submission snapshot</Text>
              <Text style={styles.summaryBody}>
                Read-only values that help explain the environment in which this
                entry was created.
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{valueCount}</Text>
            </View>
          </View>

          {populatedSections.length > 0 ? (
            <View style={styles.sections}>
              {populatedSections.map(
                ({ key, label, description, Icon, values }) => (
                  <View key={key} style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon}>
                        <Icon color={theme.muted} size={17} />
                      </View>
                      <View style={styles.sectionHeadingCopy}>
                        <Text style={styles.sectionTitle}>{label}</Text>
                        <Text style={styles.sectionDescription}>
                          {description}
                        </Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>
                          {Object.keys(values ?? {}).length}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.valueList}>
                      {Object.entries(values ?? {}).map(([key, value]) => (
                        <View key={key} style={styles.valueRow}>
                          <View style={styles.valueLabelRow}>
                            <Text style={styles.valueLabel}>
                              {formatMetadataKey(key)}
                            </Text>
                            <Text style={styles.valueType}>
                              {metadataValueType(value)}
                            </Text>
                          </View>
                          <Text selectable style={styles.value}>
                            {formatMetadataValue(value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ),
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Info color={theme.muted} size={20} />
              <Text style={styles.emptyTitle}>No metadata values</Text>
              <Text style={styles.emptyBody}>
                This entry does not contain any diagnostic values.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const modalEdges: Edge[] = ["top", "bottom"];

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    modalSafeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    modalHeading: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    modalIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
    },
    modalHeadingCopy: { flex: 1, gap: 3 },
    modalTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
    },
    modalSubtitle: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    closeButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surfaceMuted,
    },
    modalContent: {
      gap: 16,
      padding: 20,
      paddingBottom: 28,
    },
    summaryCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 14,
      backgroundColor: theme.primarySoft,
      padding: 14,
    },
    summaryCopy: { flex: 1, gap: 3 },
    summaryTitle: { color: theme.text, fontSize: 13, fontWeight: "700" },
    summaryBody: { color: theme.muted, fontSize: 12, lineHeight: 18 },
    countBadge: {
      minWidth: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: theme.surface,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    countText: { color: theme.primary, fontSize: 11, fontWeight: "700" },
    sections: { gap: 14 },
    sectionCard: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      padding: 14,
    },
    sectionIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: theme.surface,
    },
    sectionHeadingCopy: { flex: 1, gap: 2 },
    sectionTitle: { color: theme.text, fontSize: 13, fontWeight: "700" },
    sectionDescription: { color: theme.muted, fontSize: 11, lineHeight: 16 },
    valueList: { paddingHorizontal: 14 },
    valueRow: {
      gap: 5,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingVertical: 12,
    },
    valueLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    valueLabel: { color: theme.muted, fontSize: 11, fontWeight: "600" },
    valueType: {
      color: theme.muted,
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    value: {
      color: theme.text,
      fontFamily: "monospace",
      fontSize: 12,
      lineHeight: 18,
    },
    emptyCard: {
      alignItems: "center",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 24,
      paddingVertical: 42,
    },
    emptyTitle: {
      marginTop: 10,
      color: theme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    emptyBody: {
      maxWidth: 280,
      marginTop: 4,
      color: theme.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
    },
    pressed: { opacity: 0.7 },
  });
}
