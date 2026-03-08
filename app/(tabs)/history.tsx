import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { HeroPanel } from "@/components/HeroPanel";
import { MetricStrip } from "@/components/MetricStrip";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { getActiveAthleteId, listRecentImportJobs } from "@/lib/local-store";
import { syncPending } from "@/lib/sync";
import { theme } from "@/lib/theme";
import type { ImportJob } from "@/types/domain";

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [syncMessage, setSyncMessage] = useState("No sync run yet.");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const athleteId = await getActiveAthleteId(db);
      if (!athleteId) {
        return;
      }
      const rows = await listRecentImportJobs(db, athleteId);
      if (!cancelled) {
        setJobs(rows);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function handleSync() {
    const result = await syncPending(db);
    if (result.skipped) {
      setSyncMessage(result.reason ?? "Sync skipped.");
      return;
    }
    setSyncMessage(`Synced ${result.synced} pending record(s).`);
  }

  return (
    <Screen>
      <HeroPanel
        eyebrow="Sync"
        title="Keep local capture and Supabase in step."
        detail="This screen is operational: queue status, cloud sync, and import-job visibility."
        tone="plum"
      />

      <Card tone="accent" title="Supabase sync" subtitle="Push local profile, check-ins, sessions, and import jobs into framlab_production.">
        <AppButton label="Sync pending data" onPress={() => void handleSync()} tone="plum" />
        <Text style={styles.syncMessage}>{syncMessage}</Text>
      </Card>

      <SectionTitle title="Import jobs" detail="Most recent local queue state for session files and downstream parsing." />

      <Card title="Import jobs" subtitle="Uploaded means staged locally; scored means the backend has processed the file.">
        {jobs.length ? (
          jobs.map((job) => (
            <MetricStrip key={job.id} label={job.id} value={job.status} tone={job.status === "failed" ? "alert" : "neutral"} />
          ))
        ) : (
          <Text>No import jobs yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  syncMessage: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
