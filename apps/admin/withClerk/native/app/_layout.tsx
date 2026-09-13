import { ClerkProvider, useAuth } from "@clerk/expo";
import { AuthView, UserButton } from "@clerk/expo/native";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  ConvexReactClient,
  useConvexAuth,
  useQuery_experimental,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { anyApi } from "convex/server";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { adminTheme } from "@/constants/AdminTheme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!publishableKey || !convexUrl) {
  throw new Error(
    "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_CONVEX_URL in .env.local",
  );
}

const requiredPublishableKey: string = publishableKey;
const requiredConvexUrl: string = convexUrl;
const convex = new ConvexReactClient(requiredConvexUrl);

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={requiredPublishableKey}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AdminGate />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function AdminGate() {
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const convexAuth = useConvexAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  const loading = !clerk.isLoaded || convexAuth.isLoading;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {loading ? (
          <Centered>
            <ActivityIndicator color={adminTheme.primary} />
          </Centered>
        ) : !clerk.isSignedIn || !convexAuth.isAuthenticated ? (
          <Centered>
            <Text style={styles.title}>Convex Feedback Admin</Text>
            <Text style={styles.body}>
              Sign in with an admin account to continue.
            </Text>
            <Button
              title="Sign in"
              color={adminTheme.primary}
              onPress={() => setAuthOpen(true)}
            />
          </Centered>
        ) : (
          <AdminAccessCheck key={retryCount} onRetry={retry} />
        )}
        <Modal
          visible={authOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setAuthOpen(false)}
        >
          <AuthView onDismiss={() => setAuthOpen(false)} />
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

function AdminAccessCheck({ onRetry }: { onRetry: () => void }) {
  const accessCheck = useQuery_experimental({
    query: anyApi.feedback.isAdmin,
    args: {},
  });
  const errorMessage =
    accessCheck.status === "error" ? accessCheck.error.message : undefined;

  useEffect(() => {
    if (errorMessage === undefined) return;
    Alert.alert("Unable to verify access", errorMessage, [
      { text: "Cancel", style: "cancel" },
      { text: "Retry", onPress: onRetry },
    ]);
  }, [errorMessage, onRetry]);

  if (accessCheck.status === "pending") {
    return (
      <Centered>
        <ActivityIndicator color={adminTheme.primary} />
      </Centered>
    );
  }
  if (accessCheck.status === "error") {
    return (
      <Centered>
        <Text style={styles.title}>Unable to verify access</Text>
        <Text style={styles.body}>{errorMessage}</Text>
        <Button title="Retry" color={adminTheme.primary} onPress={onRetry} />
      </Centered>
    );
  }
  if (!accessCheck.data) {
    return (
      <Centered>
        <Text style={styles.title}>Admin access required</Text>
        <Text style={styles.body}>
          The host actor resolver did not grant this account admin access.
        </Text>
        <UserButton />
      </Centered>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: adminTheme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="feedback/[entryId]"
        options={modalScreenOptions("Feedback")}
      />
      <Stack.Screen
        name="feedback/new"
        options={modalScreenOptions("New feedback")}
      />
      <Stack.Screen
        name="feedback/[entryId]/edit"
        options={modalScreenOptions("Edit feedback")}
      />
      <Stack.Screen
        name="roadmap/new"
        options={modalScreenOptions("New roadmap item")}
      />
      <Stack.Screen
        name="roadmap/[roadmapId]"
        options={modalScreenOptions("Roadmap item")}
      />
      <Stack.Screen
        name="roadmap/[roadmapId]/edit"
        options={modalScreenOptions("Edit roadmap item")}
      />
    </Stack>
  );
}

function modalScreenOptions(title: string) {
  return {
    title,
    presentation: "formSheet" as const,
    headerShown: true,
    headerBackVisible: false,
    contentStyle: { backgroundColor: "transparent" },
    sheetAllowedDetents: [0.88, 1],
    sheetInitialDetentIndex: 1,
    sheetGrabberVisible: true,
    sheetLargestUndimmedDetentIndex: "last" as const,
  };
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: adminTheme.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 28,
  },
  title: { color: adminTheme.text, fontSize: 21, fontWeight: "700" },
  body: {
    maxWidth: 360,
    color: adminTheme.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
