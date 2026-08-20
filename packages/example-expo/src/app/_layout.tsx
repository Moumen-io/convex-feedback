// src/app/_layout.tsx

import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useMemo } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

const tokenStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export default function RootLayout() {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), []);

  const isWeb = Platform.OS === "web";

  return (
    <ConvexAuthProvider
      client={convex}
      storage={isWeb ? undefined : tokenStorage}
      storageNamespace={isWeb ? undefined : "convex-feedback-native-demo"}
    >
      <SafeAreaProvider>
        <Stack />
      </SafeAreaProvider>
    </ConvexAuthProvider>
  );
}
