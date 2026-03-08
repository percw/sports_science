import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { HeroPanel } from "@/components/HeroPanel";
import { Screen } from "@/components/Screen";
import { ScaleSelector } from "@/components/ScaleSelector";
import { SectionTitle } from "@/components/SectionTitle";
import { todayIso } from "@/lib/format";
import { createId } from "@/lib/ids";
import { getActiveAthleteId, savePerformanceAnchor } from "@/lib/local-store";
import { theme } from "@/lib/theme";

export default function PerformanceAnchorsScreen() {
  const db = useSQLiteContext();
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [protocol, setProtocol] = useState("2k_skierg");
  const [resultTime, setResultTime] = useState("");
  const [avgPower, setAvgPower] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    const athleteId = await getActiveAthleteId(db);
    if (!athleteId) {
      Alert.alert("Create an athlete first", "The onboarding profile is required before adding a performance anchor.");
      return;
    }

    await savePerformanceAnchor(db, {
      id: createId("anchor"),
      athlete_id: athleteId,
      anchor_date: anchorDate,
      test_protocol: protocol,
      result_time_s: Number(resultTime) || null,
      result_avg_power_w: Number(avgPower) || null,
      test_rpe_1_10: Number(rpe) || null,
      notes: notes || null,
      sync_status: "pending",
    });

    router.back();
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Anchor"
        title="Use occasional hard efforts to recalibrate the ceiling."
        detail="These tests are not daily readiness inputs. They are sparse anchors that keep submaximal markers honest."
        tone="warm"
      />

      <SectionTitle
        title="Anchor result"
        detail="Keep the protocol fixed when possible. The value comes from repeatability, not novelty."
      />

      <Card>
        <Field label="Anchor date" value={anchorDate} onChangeText={setAnchorDate} />
        <Field label="Protocol" value={protocol} onChangeText={setProtocol} placeholder="2k_skierg" />
        <Field label="Result time (s)" value={resultTime} onChangeText={setResultTime} keyboardType="decimal-pad" placeholder="398.2" />
        <Field label="Average power (W)" value={avgPower} onChangeText={setAvgPower} keyboardType="numeric" placeholder="265" />
      </Card>

      <Card tone="muted">
        <ScaleSelector label="Test RPE" value={rpe} onChange={setRpe} range={[6, 7, 8, 9, 10]} />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="legs heavy, hot room, smooth pacing, etc." />
        <AppButton label="Save performance anchor" onPress={() => void handleSave()} tone="warm" />
      </Card>

      <View style={styles.noteWrap}>
        <Text style={styles.note}>A monthly anchor is enough for v1. The structured weekly sessions should carry the day-to-day signal.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteWrap: {
    paddingHorizontal: 2,
  },
  note: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
