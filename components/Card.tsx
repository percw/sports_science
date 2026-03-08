import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/lib/theme";

export function Card({
  title,
  subtitle,
  tone = "default",
  children,
}: PropsWithChildren<{ title?: string; subtitle?: string; tone?: "default" | "muted" | "accent" }>) {
  const accent =
    tone === "accent"
      ? { backgroundColor: "#eef4f6", borderColor: "#b9d0d8" }
      : tone === "muted"
        ? { backgroundColor: theme.colors.surfaceMuted, borderColor: "#e2d8c9" }
        : null;

  return (
    <View style={[styles.card, accent]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#463f34",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
  },
  body: {
    marginTop: 14,
    gap: 12,
  },
});
