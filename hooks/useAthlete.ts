import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { getActiveAthleteId, getAthleteProfile } from "@/lib/local-store";
import type { AthleteProfile } from "@/types/domain";

export function useAthlete() {
  const db = useSQLiteContext();
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const athleteId = await getActiveAthleteId(db);
      if (!athleteId) {
        if (!cancelled) {
          setAthlete(null);
          setLoading(false);
        }
        return;
      }

      const profile = await getAthleteProfile(db, athleteId);
      if (!cancelled) {
        setAthlete(profile ?? null);
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [db]);

  return { athlete, loading };
}
