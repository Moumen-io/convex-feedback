import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is missing. Add it to packages/example-expo-routed/.env.local.",
  );
}

const tokenStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

function AnonymousSession({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || started.current) return;
    started.current = true;
    void signIn("anonymous").catch(() => {
      started.current = false;
    });
  }, [isAuthenticated, isLoading, signIn]);

  if (isLoading || !isAuthenticated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Preparing anonymous session…</Text>
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  const convex = useMemo(() => new ConvexReactClient(convexUrl!), []);
  const isWeb = Platform.OS === "web";

  return (
    <ConvexAuthProvider
      client={convex}
      storage={isWeb ? undefined : tokenStorage}
      storageNamespace={isWeb ? undefined : "convex-feedback-routed-demo"}
    >
      <AnonymousSession>
        <SafeAreaProvider>
          <Stack>
            <Stack.Screen name="index" options={{ title: "Examples" }} />
            <Stack.Screen name="feedback" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </AnonymousSession>
    </ConvexAuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#666674" },
});
