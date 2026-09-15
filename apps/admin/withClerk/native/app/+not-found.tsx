import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAdminTheme, type AdminTheme } from "@/constants/AdminTheme";

export default function NotFoundScreen() {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

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

function createStyles(theme: AdminTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      padding: 20,
    },
    title: {
      fontSize: 20,
      color: theme.text,
      fontWeight: "700",
    },
    link: {
      color: theme.primary,
      fontSize: 15,
      marginTop: 15,
      paddingVertical: 15,
    },
  });
}
