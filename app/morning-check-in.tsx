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
import { getActiveAthleteId, upsertDailyState } from "@/lib/local-store";
import { theme } from "@/lib/theme";

export default function MorningCheckInScreen() {
  const db = useSQLiteContext();
  const [date, setDate] = useState(todayIso());
  const [restingHr, setRestingHr] = useState("");
  const [rmssd, setRmssd] = useState("");
  const [sleepMinutes, setSleepMinutes] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [soreness, setSoreness] = useState("");
  const [motivation, setMotivation] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");

  async function handleSave() {
    const athleteId = await getActiveAthleteId(db);
    if (!athleteId) {
      Alert.alert("Create an athlete first", "The onboarding profile is required before daily capture.");
      return;
    }

    await upsertDailyState(db, {
      athlete_id: athleteId,
      date,
      resting_hr_bpm: Number(restingHr) || null,
      hrv_rmssd_ms: Number(rmssd) || null,
      sleep_duration_min: Number(sleepMinutes) || null,
      sleep_quality_1_5: Number(sleepQuality) || null,
      body_weight_kg: Number(bodyWeight) || null,
      soreness_1_5: Number(soreness) || null,
      motivation_1_5: Number(motivation) || null,
      mood_1_5: Number(mood) || null,
      energy_1_5: Number(energy) || null,
      sync_status: "pending",
    });

    router.back();
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Morning"
        title="Three minutes, same routine, every day."
        detail="The app cares more about consistency than gadget complexity. Capture the same state the same way."
        tone="blue"
      />

      <SectionTitle
        title="Biomarkers"
        detail="Enter the signals that change earliest: resting HR, RMSSD, sleep, and body weight."
      />

      <Card>
        <Field label="Date" value={date} onChangeText={setDate} />
        <Field label="Resting HR" value={restingHr} onChangeText={setRestingHr} keyboardType="numeric" placeholder="48" />
        <Field label="HRV RMSSD" value={rmssd} onChangeText={setRmssd} keyboardType="numeric" placeholder="72" />
        <Field label="Sleep duration (min)" value={sleepMinutes} onChangeText={setSleepMinutes} keyboardType="numeric" placeholder="460" />
        <Field label="Body weight (kg)" value={bodyWeight} onChangeText={setBodyWeight} keyboardType="decimal-pad" placeholder="82.3" />
      </Card>

      <Card tone="muted">
        <ScaleSelector label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Soreness" value={soreness} onChange={setSoreness} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Motivation" value={motivation} onChange={setMotivation} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Mood" value={mood} onChange={setMood} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Energy" value={energy} onChange={setEnergy} range={[1, 2, 3, 4, 5]} />
        <AppButton label="Save morning check-in" onPress={() => void handleSave()} />
      </Card>

      <View style={styles.noteWrap}>
        <Text style={styles.note}>A slight resting HR rise or an RMSSD drop matters more when the measurement routine is stable.</Text>
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
