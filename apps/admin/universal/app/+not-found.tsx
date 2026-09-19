import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAdminTheme } from "convex-feedback-admin-app-screens/native";

export default function NotFoundScreen() {
  const theme = useAdminTheme();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          This admin screen does not exist.
        </Text>
        <Link href="/" style={[styles.link, { color: theme.primary }]}>
          Return to the inbox
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: "700" },
  link: { fontSize: 15, marginTop: 15, paddingVertical: 15 },
});
