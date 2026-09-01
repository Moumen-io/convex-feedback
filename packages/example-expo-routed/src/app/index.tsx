import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Convex Feedback</Text>
      <Text style={styles.body}>
        Open the routed example to navigate between the board, entry details,
        and the create-entry modal using Expo Router.
      </Text>
      <Link href="/feedback" style={styles.link}>
        Open routed feedback
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#f7f7fa",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#20202a" },
  body: { maxWidth: 520, fontSize: 16, lineHeight: 24, color: "#666674" },
  link: { color: "#5b5bd6", fontSize: 17, fontWeight: "600" },
});
