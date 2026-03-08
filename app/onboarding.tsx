import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { HeroPanel } from "@/components/HeroPanel";
import { MetricStrip } from "@/components/MetricStrip";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { todayIso } from "@/lib/format";
import { createId } from "@/lib/ids";
import { saveAthleteProfile, saveReadinessSnapshot } from "@/lib/local-store";
import { theme } from "@/lib/theme";

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const [displayName, setDisplayName] = useState("");
  const [sportFocus, setSportFocus] = useState("multisport");
  const [refPower, setRefPower] = useState("180");
  const [thresholdPower, setThresholdPower] = useState("210");
  const [intervalPower, setIntervalPower] = useState("275");

  async function handleSave() {
    const athleteId = createId("athlete");
    await saveAthleteProfile(db, {
      id: athleteId,
      display_name: displayName || "Research Athlete",
      sport_focus: sportFocus || "multisport",
      baseline_ref_power_w: Number(refPower) || null,
      baseline_threshold_power_w: Number(thresholdPower) || null,
      baseline_interval_power_w: Number(intervalPower) || null,
      preferred_ramp_day: "Wednesday",
      preferred_steady_day: "Friday",
      preferred_interval_day: "Monday",
      sync_status: "pending",
    });

    await saveReadinessSnapshot(db, {
      athlete_id: athleteId,
      snapshot_date: todayIso(),
      model_version: "bootstrap-v1",
      readiness_score: 74,
      confidence: 0.42,
      aerobic_fatigue: 0.9,
      neuromuscular_fatigue: 0.6,
      central_fatigue: 0.5,
      fitness: 1.1,
      contributor_summary: "Baseline snapshot only. Add morning and session data to replace this placeholder.",
      contributor_json: JSON.stringify([
        { label: "Profile seeded", direction: "neutral" },
        { label: "No imported sessions yet", direction: "alert" },
      ]),
    });

    router.replace("/(tabs)/dashboard");
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Sport Science"
        title="Build a clean dataset before chasing a smart score."
        detail="Set the athlete identity and power anchors once. The rest of the app stays quick by design."
        tone="warm"
      >
        <View style={styles.heroMetrics}>
          <MetricStrip label="Weekly rhythm" value="Mon / Wed / Fri" />
          <MetricStrip label="Primary output" value="Daily readiness" tone="positive" />
        </View>
      </HeroPanel>

      <SectionTitle
        title="Athlete profile"
        detail="Use realistic baseline powers. They shape the interpretation of ramp, steady, and 30/15 session markers."
      />

      <Card>
        <Field label="Athlete name" value={displayName} onChangeText={setDisplayName} placeholder="Research Athlete" />
        <Field label="Sport focus" value={sportFocus} onChangeText={setSportFocus} placeholder="multisport" />
      </Card>

      <Card tone="muted" title="Reference powers" subtitle="These are defaults for display and protocol context, not hard physiological limits.">
        <Field label="Reference power (W)" value={refPower} onChangeText={setRefPower} keyboardType="numeric" placeholder="180" />
        <Field label="Threshold power (W)" value={thresholdPower} onChangeText={setThresholdPower} keyboardType="numeric" placeholder="210" />
        <Field label="30/15 target power (W)" value={intervalPower} onChangeText={setIntervalPower} keyboardType="numeric" placeholder="275" />
        <AppButton label="Create athlete profile" onPress={() => void handleSave()} tone="warm" />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>You can change these later. The goal is a stable starting protocol, not perfect calibration on day one.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroMetrics: {
    gap: 8,
  },
  footer: {
    paddingHorizontal: 4,
  },
  footerText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
