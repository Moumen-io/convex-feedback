import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { adminTheme } from "@/constants/AdminTheme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This admin screen does not exist.</Text>

        <Link href="/" style={styles.link}>
          Return to the inbox
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminTheme.background,
    padding: 20,
  },
  title: {
    fontSize: 20,
    color: adminTheme.text,
    fontWeight: "700",
  },
  link: {
    color: adminTheme.primary,
    fontSize: 15,
    marginTop: 15,
    paddingVertical: 15,
  },
});
