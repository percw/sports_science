import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Card } from "@/components/Card";
import { HeroPanel } from "@/components/HeroPanel";
import { MetricStrip } from "@/components/MetricStrip";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAthlete } from "@/hooks/useAthlete";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatScore } from "@/lib/format";
import { theme } from "@/lib/theme";

export default function DashboardScreen() {
  const { athlete } = useAthlete();
  const { snapshot, sessions, loading } = useDashboardData();
  const contributors = snapshot?.contributor_json
    ? JSON.parse(snapshot.contributor_json) as { label: string; direction: string }[]
    : [];

  return (
    <Screen>
      <HeroPanel
        eyebrow={athlete ? athlete.display_name : "Daily readiness"}
        title={loading ? "Loading today's state" : snapshot ? `${formatScore(snapshot.readiness_score)} readiness` : "No readiness snapshot"}
        detail="Interpretable latent-state estimate from the latest local or synced dataset."
        tone="blue"
      >
        <View style={styles.heroGrid}>
          <View style={styles.heroBox}>
            <Text style={styles.heroBoxLabel}>Confidence</Text>
            <Text style={styles.heroBoxValue}>{snapshot ? `${formatScore(snapshot.confidence * 100)}%` : "No model"}</Text>
          </View>
          <View style={styles.heroBox}>
            <Text style={styles.heroBoxLabel}>Model</Text>
            <Text style={styles.heroBoxValue}>{snapshot?.model_version ?? "waiting"}</Text>
          </View>
        </View>
      </HeroPanel>

      <Card title="Latent states" subtitle="Stored separately so you can see which system is driving the score.">
        <MetricStrip label="Aerobic fatigue" value={snapshot ? formatScore(snapshot.aerobic_fatigue, 2) : "-"} tone="alert" />
        <MetricStrip label="Neuromuscular fatigue" value={snapshot ? formatScore(snapshot.neuromuscular_fatigue, 2) : "-"} tone="alert" />
        <MetricStrip label="Central fatigue" value={snapshot ? formatScore(snapshot.central_fatigue, 2) : "-"} tone="alert" />
        <MetricStrip label="Fitness" value={snapshot ? formatScore(snapshot.fitness, 2) : "-"} tone="positive" />
      </Card>

      <SectionTitle title="Why the score moved" detail={snapshot?.contributor_summary ?? "No contributor breakdown yet."} />

      <Card tone="muted">
        {contributors.length ? (
          contributors.map((item) => (
            <MetricStrip
              key={item.label}
              label={item.label}
              value={item.direction}
              tone={item.direction === "positive" ? "positive" : item.direction === "alert" ? "alert" : "neutral"}
            />
          ))
        ) : (
          <Text style={styles.empty}>Upload sessions and submit morning/evening entries to replace the bootstrap snapshot.</Text>
        )}
      </Card>

      <SectionTitle title="Recent structured sessions" detail="A quick read on what has actually been staged or processed lately." />

      <Card title="Recent structured sessions" subtitle="Imported locally or synced from the worker pipeline.">
        {sessions.length ? (
          sessions.slice(0, 5).map((session) => (
            <Pressable key={session.id} style={styles.sessionRow} onPress={() => router.push(`/session/${session.id}`)}>
              <View>
                <Text style={styles.sessionTitle}>{session.source_file_name ?? session.session_protocol}</Text>
                <Text style={styles.sessionMeta}>
                  {session.session_date} · {session.session_protocol} · {session.sync_status}
                </Text>
              </View>
              <Text style={styles.sessionChevron}>›</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>No sessions stored yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroGrid: {
    flexDirection: "row",
    gap: 10,
  },
  heroBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 16,
    padding: 14,
  },
  heroBoxLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  heroBoxValue: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  empty: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sessionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  sessionMeta: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  sessionChevron: {
    fontSize: 24,
    color: theme.colors.textSoft,
  },
});
