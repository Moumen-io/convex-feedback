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
import { NativeStackNavigationOptions, Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";

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
  const theme = useAdminTheme();
  const styles = createStyles(theme);
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
            <ActivityIndicator color={theme.primary} />
          </Centered>
        ) : !clerk.isSignedIn || !convexAuth.isAuthenticated ? (
          <Centered>
            <Text style={styles.title}>Convex Feedback Admin</Text>
            <Text style={styles.body}>
              Sign in with an admin account to continue.
            </Text>
            <Button
              title="Sign in"
              color={theme.primary}
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
  const theme = useAdminTheme();
  const styles = createStyles(theme);
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
        <ActivityIndicator color={theme.primary} />
      </Centered>
    );
  }
  if (accessCheck.status === "error") {
    return (
      <Centered>
        <Text style={styles.title}>Unable to verify access</Text>
        <Text style={styles.body}>{errorMessage}</Text>
        <Button title="Retry" color={theme.primary} onPress={onRetry} />
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
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="feedback/[entryId]"
        options={modalScreenOptions("Feedback", theme)}
      />
      <Stack.Screen
        name="feedback/new"
        options={modalScreenOptions("New feedback", theme)}
      />
      <Stack.Screen
        name="feedback/[entryId]/edit"
        options={modalScreenOptions("Edit feedback", theme)}
      />
      <Stack.Screen
        name="roadmap/new"
        options={modalScreenOptions("New roadmap item", theme)}
      />
      <Stack.Screen
        name="roadmap/[roadmapId]"
        options={modalScreenOptions("Roadmap item", theme)}
      />
      <Stack.Screen
        name="roadmap/[roadmapId]/edit"
        options={modalScreenOptions("Edit roadmap item", theme)}
      />
    </Stack>
  );
}

function modalScreenOptions(
  title: string,
  theme: AdminTheme,
): NativeStackNavigationOptions {
  const isIos = Platform.OS === "ios";

  return {
    title,
    presentation: isIos ? "formSheet" : "modal",
    headerShown: true,
    headerTransparent: true,
    headerBackVisible: false,
    contentStyle: { backgroundColor: theme.background },
    sheetAllowedDetents: [0.65, 1],
    sheetGrabberVisible: true,
  };
}

function Centered({ children }: { children: React.ReactNode }) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return <View style={styles.centered}>{children}</View>;
}

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 28,
    },
    title: { color: theme.text, fontSize: 21, fontWeight: "700" },
    body: {
      maxWidth: 360,
      color: theme.muted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
    },
  });
}
