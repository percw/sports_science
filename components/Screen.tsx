import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import { theme } from "@/lib/theme";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
  content: {
    paddingBottom: 56,
  },
  inner: {
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 18,
  },
  orbTop: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -70,
    top: -40,
    backgroundColor: "#dce8e3",
    opacity: 0.65,
  },
  orbBottom: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 999,
    left: -80,
    bottom: 120,
    backgroundColor: "#efe2d4",
    opacity: 0.7,
  },
});
