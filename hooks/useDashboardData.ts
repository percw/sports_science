import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  getActiveAthleteId,
  getLatestReadinessSnapshot,
  listRecentSessions,
} from "@/lib/local-store";
import type { ReadinessSnapshot, TrainingSession } from "@/types/domain";

export function useDashboardData() {
  const db = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<ReadinessSnapshot | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const athleteId = await getActiveAthleteId(db);
      if (!athleteId) {
        if (!cancelled) {
          setSnapshot(null);
          setSessions([]);
          setLoading(false);
        }
        return;
      }

      const [latest, recentSessions] = await Promise.all([
        getLatestReadinessSnapshot(db, athleteId),
        listRecentSessions(db, athleteId),
      ]);

      if (!cancelled) {
        setSnapshot(latest ?? null);
        setSessions(recentSessions);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [db]);

  return { snapshot, sessions, loading };
}
