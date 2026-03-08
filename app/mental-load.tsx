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
import { getActiveAthleteId, upsertMentalLoad } from "@/lib/local-store";
import { theme } from "@/lib/theme";

export default function MentalLoadScreen() {
  const db = useSQLiteContext();
  const [date, setDate] = useState(todayIso());
  const [stress, setStress] = useState("");
  const [demand, setDemand] = useState("");
  const [valence, setValence] = useState("");
  const [focus, setFocus] = useState("");
  const [pvtMean, setPvtMean] = useState("");
  const [pvtLapses, setPvtLapses] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    const athleteId = await getActiveAthleteId(db);
    if (!athleteId) {
      Alert.alert("Create an athlete first", "The onboarding profile is required before mental-load capture.");
      return;
    }

    await upsertMentalLoad(db, {
      athlete_id: athleteId,
      date,
      perceived_stress_1_5: Number(stress) || null,
      cognitive_demand_1_5: Number(demand) || null,
      emotional_valence_1_5: Number(valence) || null,
      focus_quality_1_5: Number(focus) || null,
      pvt_mean_rt_ms: Number(pvtMean) || null,
      pvt_lapses: Number(pvtLapses) || null,
      notes: notes || null,
      sync_status: "pending",
    });

    router.back();
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Evening"
        title="Keep mental load separate from physical fatigue."
        detail="The most interesting days are the ones where perception, HRV, and session response do not agree."
        tone="plum"
      />

      <SectionTitle
        title="Cognitive state"
        detail="These inputs help the model tell apart training fatigue, work stress, and emotional drag."
      />

      <Card tone="muted">
        <Field label="Date" value={date} onChangeText={setDate} />
        <ScaleSelector label="Perceived stress" value={stress} onChange={setStress} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Cognitive demand" value={demand} onChange={setDemand} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Emotional valence" value={valence} onChange={setValence} range={[1, 2, 3, 4, 5]} />
        <ScaleSelector label="Focus quality" value={focus} onChange={setFocus} range={[1, 2, 3, 4, 5]} />
      </Card>

      <Card>
        <Field label="PVT mean RT (ms)" value={pvtMean} onChangeText={setPvtMean} keyboardType="numeric" placeholder="287" helper="Optional but valuable when you want an objective cognitive measure." />
        <Field label="PVT lapses" value={pvtLapses} onChangeText={setPvtLapses} keyboardType="numeric" placeholder="1" />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="deadline, travel, conflict, unusually calm day" />
        <AppButton label="Save mental load" onPress={() => void handleSave()} tone="plum" />
      </Card>

      <View style={styles.noteWrap}>
        <Text style={styles.note}>If mental load spikes while sleep and HRV look normal, that divergence is still useful signal.</Text>
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
