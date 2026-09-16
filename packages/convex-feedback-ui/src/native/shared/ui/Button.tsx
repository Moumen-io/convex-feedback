import { Pressable, Text } from "react-native";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";

export function Button({
  label,
  onPress,
  variant = "default",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "default" | "primary";
  disabled?: boolean;
}) {
  const { theme } = useFeedbackUi();
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        alignSelf: primary ? "center" : "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 11,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: primary ? theme.colors.primary : theme.colors.border,
        backgroundColor: primary ? theme.colors.primary : undefined,
        opacity: disabled ? 0.55 : 1,
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
