import { useState } from "react";
import { Alert, type StyleProp } from "react-native";

export function combineStyle<T>(
  enabled: boolean,
  fallback: StyleProp<T>,
  style: StyleProp<T>,
): StyleProp<T> {
  return enabled ? [fallback, style] : style;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Runs a native UI mutation and offers a single retry action on failure. */
export function useNativeAction() {
  const [pending, setPending] = useState(false);

  const run = async <T>(
    action: () => Promise<T>,
    title: string,
    retryAction: () => Promise<unknown> = action,
  ): Promise<T | undefined> => {
    if (pending) return undefined;
    setPending(true);
    try {
      return await action();
    } catch (error) {
      Alert.alert(title, errorMessage(error), [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retry",
          onPress: () => {
            void run(retryAction, title, retryAction);
          },
        },
      ]);
      return undefined;
    } finally {
      setPending(false);
    }
  };

  return { pending, run };
}
