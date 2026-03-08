import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/lib/theme";

export function MetricStrip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "alert";
}) {
  const palette =
    tone === "positive"
      ? { text: theme.colors.accentForest, bg: theme.colors.successBg }
      : tone === "alert"
        ? { text: theme.colors.accentCrimson, bg: theme.colors.dangerBg }
        : { text: theme.colors.accent, bg: theme.colors.infoBg };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.badge, { backgroundColor: palette.bg }]}>
        <Text style={[styles.value, { color: palette.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  label: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    minHeight: 34,
    minWidth: 74,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 13,
    fontWeight: "800",
  },
});
