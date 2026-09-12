import { ClerkProvider, useAuth } from "@clerk/expo";
import { AuthView, UserButton } from "@clerk/expo/native";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { anyApi } from "convex/server";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { adminTheme } from "@/constants/AdminTheme";
import { TagsProvider } from "@/providers/tags-provider";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!publishableKey || !convexUrl) {
  throw new Error(
    "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_CONVEX_URL in .env.local",
  );
}

const convex = new ConvexReactClient(convexUrl);

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
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
  const [allowed, setAllowed] = useState<boolean | undefined>();

  useEffect(() => {
    if (!convexAuth.isAuthenticated) {
      setAllowed(undefined);
      return;
    }
    let active = true;
    void convex
      .query(anyApi.feedback.isAdmin, {})
      .then((result) => active && setAllowed(result as boolean))
      .catch(() => active && setAllowed(false));
    return () => {
      active = false;
    };
  }, [convexAuth.isAuthenticated]);

  const loading = !clerk.isLoaded || convexAuth.isLoading;

  return (
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
      ) : allowed === undefined ? (
        <Centered>
          <ActivityIndicator color={adminTheme.primary} />
        </Centered>
      ) : !allowed ? (
        <Centered>
          <Text style={styles.title}>Admin access required</Text>
          <Text style={styles.body}>
            The host actor resolver did not grant this account admin access.
          </Text>
          <UserButton />
        </Centered>
      ) : (
        <TagsProvider>
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              contentStyle: { backgroundColor: adminTheme.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="feedback/[entryId]"
              options={{ title: "Feedback", presentation: "modal" }}
            />
          </Stack>
        </TagsProvider>
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
  );
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
