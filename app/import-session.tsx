import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as DocumentPicker from "expo-document-picker";

import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { HeroPanel } from "@/components/HeroPanel";
import { MetricStrip } from "@/components/MetricStrip";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { todayIso } from "@/lib/format";
import { createId } from "@/lib/ids";
import { createImportJob, getActiveAthleteId, saveTrainingSession } from "@/lib/local-store";
import { theme } from "@/lib/theme";
import type { SessionProtocol } from "@/types/domain";

export default function ImportSessionScreen() {
  const db = useSQLiteContext();
  const [fileName, setFileName] = useState("");
  const [fileUri, setFileUri] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [sessionDate, setSessionDate] = useState(todayIso());
  const [sport, setSport] = useState("skierg");
  const [protocol, setProtocol] = useState<SessionProtocol>("unknown");

  useEffect(() => {
    if (!fileName) {
      return;
    }
    const lower = fileName.toLowerCase();
    if (lower.includes("ramp")) {
      setProtocol("ramp");
    } else if (lower.includes("steady")) {
      setProtocol("steady_state");
    } else if (lower.includes("30") || lower.includes("interval")) {
      setProtocol("intervals_30_15");
    }
  }, [fileName]);

  async function handlePick() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      type: ["application/octet-stream", "application/xml", "text/xml", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets.length) {
      return;
    }
    const asset = result.assets[0];
    setFileName(asset.name);
    setFileUri(asset.uri);
    setMimeType(asset.mimeType ?? "");
  }

  async function handleQueue() {
    const athleteId = await getActiveAthleteId(db);
    if (!athleteId) {
      Alert.alert("Create an athlete first", "The onboarding profile is required before session import.");
      return;
    }
    if (!fileUri) {
      Alert.alert("Pick a file", "Choose a FIT, GPX, or TCX file first.");
      return;
    }

    const sessionId = createId("session");
    const jobId = createId("job");

    await saveTrainingSession(db, {
      id: sessionId,
      athlete_id: athleteId,
      session_date: sessionDate,
      session_protocol: protocol,
      sport,
      source_file_name: fileName,
      source_file_uri: fileUri,
      source_mime_type: mimeType,
      sync_status: "pending",
    });

    await createImportJob(db, {
      id: jobId,
      athlete_id: athleteId,
      local_session_id: sessionId,
      local_file_uri: fileUri,
      status: "uploaded",
    });

    router.replace(`/session/${sessionId}`);
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Import"
        title="Drop the raw file in. Let the worker do the heavy lifting."
        detail="The app only stages metadata locally. Parsing, interval detection, and marker extraction happen downstream."
        tone="forest"
      />

      <SectionTitle
        title="Source file"
        detail="FIT is the ideal source. GPX and TCX are still useful, but they usually carry less of the session shape."
      />

      <Card tone="accent">
        <AppButton label={fileName ? "Replace selected file" : "Choose FIT / GPX / TCX file"} onPress={() => void handlePick()} tone="forest" />
        <MetricStrip label="Selected file" value={fileName || "None yet"} />
        <MetricStrip label="Ready to upload" value={fileUri ? "Yes" : "No"} tone={fileUri ? "positive" : "neutral"} />
      </Card>

      <Card>
        <Field label="Session date" value={sessionDate} onChangeText={setSessionDate} />
        <Field label="Sport" value={sport} onChangeText={setSport} placeholder="skierg" />
        <Field label="Protocol" value={protocol} onChangeText={(text) => setProtocol(text as SessionProtocol)} placeholder="ramp | steady_state | intervals_30_15" helper="Filename hints are applied automatically, but you can still override the protocol." />
        <AppButton label="Queue import job" onPress={() => void handleQueue()} tone="forest" />
      </Card>

      <View style={styles.noteWrap}>
        <Text style={styles.note}>Once synced, the backend writes normalized markers back into the session review screen.</Text>
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
