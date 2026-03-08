import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "@/lib/theme";

type Tone = "accent" | "forest" | "plum" | "warm" | "ghost";

export function AppButton({
  label,
  onPress,
  tone = "accent",
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
}) {
  const backgroundColor =
    tone === "forest"
      ? theme.colors.accentForest
      : tone === "plum"
        ? theme.colors.accentPlum
        : tone === "warm"
          ? theme.colors.accentWarm
          : tone === "ghost"
            ? theme.colors.surfaceMuted
            : theme.colors.accent;

  const textColor = tone === "ghost" ? theme.colors.text : theme.colors.white;

  return (
    <Pressable style={[styles.button, { backgroundColor }]} onPress={onPress}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
