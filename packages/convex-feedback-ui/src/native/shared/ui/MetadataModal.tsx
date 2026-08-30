import type { FeedbackMetadata } from "convex-feedback";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import { formatMetadataKey } from "../../../shared/metadata";
import { Button } from "./Button";

export function MetadataModal({
  metadata,
  onRequestClose,
}: {
  metadata: FeedbackMetadata;
  onRequestClose: () => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const sections = [
    [messages.metadata.standard, metadata.standard],
    [messages.metadata.additional, metadata.additional],
  ] as const;
  const hasValues = sections.some(
    ([, values]) => values !== undefined && Object.keys(values).length > 0,
  );

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      role="dialog"
    >
      <Pressable
        accessible={false}
        focusable={false}
        onPress={onRequestClose}
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 20,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        }}
      >
        <Pressable
          accessible={false}
          focusable={false}
          onPress={(event) => event.stopPropagation()}
          style={{
            maxHeight: "80%",
            gap: 14,
            padding: 18,
            borderRadius: theme.radius,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            {messages.metadata.title}
          </Text>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            {hasValues ? (
              sections.map(([label, values]) =>
                values === undefined ||
                Object.keys(values).length === 0 ? null : (
                  <View key={label} style={{ gap: 8 }}>
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "700" }}
                    >
                      {label}
                    </Text>
                    {Object.entries(values).map(([key, value]) => (
                      <View
                        key={key}
                        style={{
                          gap: 3,
                          paddingBottom: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.border,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.mutedText,
                            fontWeight: "600",
                          }}
                        >
                          {formatMetadataKey(key)}
                        </Text>
                        <Text selectable style={{ color: theme.colors.text }}>
                          {String(value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ),
              )
            ) : (
              <Text style={{ color: theme.colors.mutedText }}>
                {messages.metadata.empty}
              </Text>
            )}
          </ScrollView>
          <Button label={messages.metadata.close} onPress={onRequestClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
