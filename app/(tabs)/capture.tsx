import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { HeroPanel } from "@/components/HeroPanel";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { theme } from "@/lib/theme";

const actions = [
  {
    title: "Morning check-in",
    subtitle: "Resting HR, RMSSD, sleep, body weight, soreness, motivation, mood, energy.",
    href: "/morning-check-in" as const,
    tone: "accent" as const,
  },
  {
    title: "Evening mental load",
    subtitle: "Stress, cognitive demand, emotional valence, focus quality, PVT and notes.",
    href: "/mental-load" as const,
    tone: "plum" as const,
  },
  {
    title: "Import training session",
    subtitle: "Upload FIT, GPX, or TCX and create a queued import job for the worker.",
    href: "/import-session" as const,
    tone: "forest" as const,
  },
  {
    title: "Performance anchors",
    subtitle: "Track periodic max tests that recalibrate the model.",
    href: "/performance-anchors" as const,
    tone: "warm" as const,
  },
];

export default function CaptureScreen() {
  return (
    <Screen>
      <HeroPanel
        eyebrow="Capture"
        title="Fast inputs. Clean data. Minimal friction."
        detail="Every workflow here is meant to be short enough that you keep using it under normal life pressure."
        tone="blue"
      />

      <SectionTitle title="Research actions" detail="Capture the day, queue the session, and anchor the model when needed." />

      {actions.map((action) => (
        <Card key={action.title} tone={action.tone === "accent" ? "accent" : "default"}>
          <View style={styles.cardRow}>
            <View style={[styles.dot, action.tone === "plum" ? styles.dotPlum : action.tone === "forest" ? styles.dotForest : action.tone === "warm" ? styles.dotWarm : styles.dotBlue]} />
            <View style={styles.cardContent}>
              <Text style={styles.title}>{action.title}</Text>
              <Text style={styles.subtitle}>{action.subtitle}</Text>
            </View>
          </View>
          <AppButton
            label="Open"
            onPress={() => router.push(action.href)}
            tone={action.tone === "plum" ? "plum" : action.tone === "forest" ? "forest" : action.tone === "warm" ? "warm" : "accent"}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 6,
  },
  dotBlue: {
    backgroundColor: theme.colors.accent,
  },
  dotForest: {
    backgroundColor: theme.colors.accentForest,
  },
  dotPlum: {
    backgroundColor: theme.colors.accentPlum,
  },
  dotWarm: {
    backgroundColor: theme.colors.accentWarm,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
