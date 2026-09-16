import { useState } from "react";
import { Alert } from "react-native";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Runs an admin action and offers a single retry action on failure. */
export function useAdminAction() {
  const [pending, setPending] = useState(false);

  const run = async (
    action: () => Promise<unknown>,
    title: string,
  ): Promise<boolean> => {
    if (pending) return false;
    setPending(true);
    try {
      await action();
      return true;
    } catch (error) {
      Alert.alert(title, errorMessage(error), [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retry",
          onPress: () => {
            void run(action, title);
          },
        },
      ]);
      return false;
    } finally {
      setPending(false);
    }
  };

  return { pending, run };
}
