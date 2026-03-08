import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/lib/theme";

export function HeroPanel({
  eyebrow,
  title,
  detail,
  tone = "blue",
  children,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  detail: string;
  tone?: "blue" | "forest" | "plum" | "warm";
}>) {
  const palette =
    tone === "forest"
      ? { bg: theme.colors.successBg, border: "#b8d5c6", accent: theme.colors.accentForest }
      : tone === "plum"
        ? { bg: theme.colors.plumBg, border: "#d1c2da", accent: theme.colors.accentPlum }
        : tone === "warm"
          ? { bg: theme.colors.warnBg, border: "#dfc0aa", accent: theme.colors.accentWarm }
          : { bg: theme.colors.infoBg, border: "#bfd6df", accent: theme.colors.accent };

  return (
    <View style={[styles.panel, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={[styles.bloom, { backgroundColor: palette.accent }]} />
      {eyebrow ? <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: 22,
    overflow: "hidden",
  },
  bloom: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -45,
    top: -65,
    opacity: 0.08,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: theme.colors.text,
  },
  detail: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  body: {
    marginTop: 16,
    gap: 10,
  },
});
