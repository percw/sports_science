import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/lib/theme";

export function ScaleSelector({
  label,
  value,
  onChange,
  range,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  range: number[];
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {range.map((item) => {
          const active = value === String(item);
          return (
            <Pressable
              key={item}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(String(item))}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.chip,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.chipActive,
    borderColor: theme.colors.chipActive,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  chipTextActive: {
    color: theme.colors.white,
  },
});
