import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { Card } from "@/components/Card";
import { HeroPanel } from "@/components/HeroPanel";
import { MetricStrip } from "@/components/MetricStrip";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { getSessionById, getSessionMarkers } from "@/lib/local-store";
import { theme } from "@/lib/theme";
import type { SessionMarker, TrainingSession } from "@/types/domain";

export default function SessionReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [markers, setMarkers] = useState<SessionMarker[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        return;
      }
      const selected = await getSessionById(db, id);
      const markerRows = await getSessionMarkers(db, id);
      if (!cancelled) {
        setSession(selected ?? null);
        setMarkers(markerRows);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  return (
    <Screen>
      <HeroPanel
        eyebrow="Session"
        title={session?.source_file_name ?? "Session review"}
        detail="This view becomes meaningful once the worker has parsed the raw file and written normalized marker rows back."
        tone="forest"
      >
        <MetricStrip label="Protocol" value={session?.session_protocol ?? "Pending parse"} />
      </HeroPanel>

      <Card title="Metadata" subtitle="Core session identifiers and pipeline status.">
        <MetricStrip label="Session ID" value={id ?? "-"} />
        <MetricStrip label="Sport" value={session?.sport ?? "-"} />
        <MetricStrip label="Status" value={session?.sync_status ?? "pending"} />
      </Card>

      <SectionTitle title="Extracted markers" detail="The first rows below are the strongest summary features. Rep and stage arrays are flattened into marker rows." />

      <Card title="Marker stream" subtitle="Useful for a quick sanity check before you trust the model output.">
        {markers.length ? (
          markers.slice(0, 20).map((marker) => (
            <MetricStrip
              key={marker.id ?? `${marker.marker_key}-${marker.set_index ?? 0}-${marker.rep_index ?? 0}`}
              label={marker.marker_key}
              value={
                marker.numeric_value?.toString() ??
                marker.text_value ??
                marker.json_value ??
                "-"
              }
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No normalized markers stored locally yet.</Text>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 8,
  },
  emptyText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
