import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { FeedbackScreen } from "convex-feedback-ui/expo";
import { ConvexReactClient, useConvexAuth } from "convex/react";
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
import { feedbackHooks } from "./src/feedback";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is missing. Run `npm run dev` from the example-native workspace.",
  );
}

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
        <Text style={styles.loadingText}>
          Preparing anonymous demo session…
        </Text>
      </View>
    );
  }

  return children;
}

function Demo() {
  return (
    <FeedbackScreen
      hooks={feedbackHooks}
      useStack
      theme={{
        colors: {
          primary: "#5b5bd6",
          background: "#f7f7fa",
        },
      }}
      messages={{ board: { title: "Product feedback" } }}
    />
  );
}

export const convexAuthTokenStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export default function App() {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), []);

  const isWeb = Platform.OS === "web";

  return (
    <ConvexAuthProvider
      client={convex}
      storage={isWeb ? undefined : convexAuthTokenStorage}
      storageNamespace={isWeb ? undefined : "convex-feedback-native-demo"}
    >
      <AnonymousSession>
        <SafeAreaProvider>
          <Demo />
        </SafeAreaProvider>
      </AnonymousSession>
    </ConvexAuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#666674" },
});
