import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

import { useAdminScreenTheme, type AdminScreenTheme } from "./theme.js";

export interface AdminAccountModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  theme?: AdminScreenTheme;
}

export function AdminAccountModal({
  visible,
  onClose,
  children,
  theme: themeProp,
}: AdminAccountModalProps) {
  const systemTheme = useAdminScreenTheme();
  const theme = themeProp ?? systemTheme;
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={modalEdges}>
        <View style={styles.header}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Account settings</Text>
            <Text style={styles.subtitle}>
              Manage your profile, security, and sign-in methods.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close account settings"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <X color={theme.text} size={19} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const modalEdges: Edge[] = ["top", "bottom"];

function createStyles(theme: AdminScreenTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headingCopy: { flex: 1, gap: 3 },
    title: { color: theme.text, fontSize: 18, fontWeight: "700" },
    subtitle: { color: theme.mutedText, fontSize: 12, lineHeight: 17 },
    closeButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surfaceMuted,
    },
    pressed: { opacity: 0.65 },
    content: { flex: 1, minHeight: 0 },
  });
}
