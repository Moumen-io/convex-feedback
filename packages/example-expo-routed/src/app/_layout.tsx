import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
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
  const [attempt, setAttempt] = useState(0);
  const [signInFailed, setSignInFailed] = useState(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || signInFailed) return;
    let cancelled = false;
    void signIn("anonymous").catch(() => {
      if (!cancelled) setSignInFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, isAuthenticated, isLoading, signIn, signInFailed]);

  if (isLoading || !isAuthenticated) {
    return (
      <View style={styles.loading}>
        {signInFailed ? (
          <>
            <Text style={styles.loadingText}>
              Could not start an anonymous session.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSignInFailed(false);
                setAttempt((value) => value + 1);
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Preparing anonymous session…</Text>
          </>
        )}
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
  retryButton: {
    backgroundColor: "#5b5bd6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#ffffff", fontWeight: "600" },
});
