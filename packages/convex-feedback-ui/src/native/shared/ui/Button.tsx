import { Pressable, Text } from "react-native";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";

export function Button({
  label,
  onPress,
  variant = "default",
}: {
  label: string;
  onPress: () => void;
  variant?: "default" | "primary";
}) {
  const { theme } = useFeedbackUi();
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: primary ? "center" : "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 11,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: primary ? theme.colors.primary : theme.colors.border,
        backgroundColor: primary ? theme.colors.primary : undefined,
      }}
    >
      <Text
        style={{
          color: primary ? theme.colors.primaryForeground : theme.colors.text,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
