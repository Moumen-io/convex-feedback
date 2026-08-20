import { Pressable, Text } from "react-native";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";

export function Button({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useFeedbackUi();
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 11,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}
