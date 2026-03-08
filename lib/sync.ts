import type { SQLiteDatabase } from "expo-sqlite";

import { SUPABASE_BUCKET } from "@/lib/env";
import {
  getActiveAthleteId,
  getAthleteProfile,
  listPendingAthleteProfiles,
  listPendingDailyStates,
  listPendingImportJobs,
  listPendingMentalLoads,
  listPendingPerformanceAnchors,
  listPendingSessions,
  markDailyStateSynced,
  markMentalLoadSynced,
  markPerformanceAnchorSynced,
  markTableRowSynced,
  updateImportJob,
} from "@/lib/local-store";
import { supabase } from "@/lib/supabase";

async function uploadLocalFile(uri: string, targetPath: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const file = await fetch(uri);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(targetPath, bytes, {
      upsert: true,
      contentType: "application/octet-stream",
    });

  if (error) {
    throw error;
  }
}

export async function syncPending(db: SQLiteDatabase) {
  if (!supabase) {
    return { synced: 0, skipped: true, reason: "Supabase env is missing" };
  }

  const athleteId = await getActiveAthleteId(db);
  if (!athleteId) {
    return { synced: 0, skipped: true, reason: "No active athlete" };
  }

  const profile = await getAthleteProfile(db, athleteId);
  const pendingProfiles = await listPendingAthleteProfiles(db);
  const pendingDailyStates = await listPendingDailyStates(db, athleteId);
  const pendingMentalLoads = await listPendingMentalLoads(db, athleteId);
  const pendingAnchors = await listPendingPerformanceAnchors(db, athleteId);
  const pendingSessions = await listPendingSessions(db, athleteId);
  const jobs = await listPendingImportJobs(db, athleteId);
  let synced = 0;

  if (profile && pendingProfiles.some((item) => item.id === profile.id)) {
    const { error } = await supabase.from("sport_science_athlete_profile").upsert({
      id: profile.id,
      display_name: profile.display_name,
      sport_focus: profile.sport_focus,
      baseline_ref_power_w: profile.baseline_ref_power_w,
      baseline_threshold_power_w: profile.baseline_threshold_power_w,
      baseline_interval_power_w: profile.baseline_interval_power_w,
      preferred_ramp_day: profile.preferred_ramp_day,
      preferred_steady_day: profile.preferred_steady_day,
      preferred_interval_day: profile.preferred_interval_day,
    });
    if (error) {
      throw error;
    }
    await markTableRowSynced(db, "sport_science_athlete_profile", profile.id);
    synced += 1;
  }

  for (const row of pendingDailyStates) {
    const { error } = await supabase
      .from("sport_science_daily_state")
      .upsert(
        {
          athlete_id: row.athlete_id,
          date: row.date,
          resting_hr_bpm: row.resting_hr_bpm,
          hrv_rmssd_ms: row.hrv_rmssd_ms,
          sleep_duration_min: row.sleep_duration_min,
          sleep_quality_1_5: row.sleep_quality_1_5,
          body_weight_kg: row.body_weight_kg,
          soreness_1_5: row.soreness_1_5,
          motivation_1_5: row.motivation_1_5,
          mood_1_5: row.mood_1_5,
          energy_1_5: row.energy_1_5,
        },
        { onConflict: "athlete_id,date" },
      );
    if (error) {
      throw error;
    }
    await markDailyStateSynced(db, row.athlete_id, row.date);
    synced += 1;
  }

  for (const row of pendingMentalLoads) {
    const { error } = await supabase
      .from("sport_science_mental_load")
      .upsert(
        {
          athlete_id: row.athlete_id,
          date: row.date,
          perceived_stress_1_5: row.perceived_stress_1_5,
          cognitive_demand_1_5: row.cognitive_demand_1_5,
          emotional_valence_1_5: row.emotional_valence_1_5,
          focus_quality_1_5: row.focus_quality_1_5,
          pvt_mean_rt_ms: row.pvt_mean_rt_ms,
          pvt_lapses: row.pvt_lapses,
          notes: row.notes,
        },
        { onConflict: "athlete_id,date" },
      );
    if (error) {
      throw error;
    }
    await markMentalLoadSynced(db, row.athlete_id, row.date);
    synced += 1;
  }

  for (const row of pendingAnchors) {
    const { error } = await supabase.from("sport_science_performance_anchor").upsert({
      id: row.id,
      athlete_id: row.athlete_id,
      anchor_date: row.anchor_date,
      test_protocol: row.test_protocol,
      result_time_s: row.result_time_s,
      result_avg_power_w: row.result_avg_power_w,
      result_peak_power_w: row.result_peak_power_w,
      result_avg_hr_bpm: row.result_avg_hr_bpm,
      result_max_hr_bpm: row.result_max_hr_bpm,
      test_rpe_1_10: row.test_rpe_1_10,
      notes: row.notes,
    });
    if (error) {
      throw error;
    }
    await markPerformanceAnchorSynced(db, row.id);
    synced += 1;
  }

  const sessionById = new Map(pendingSessions.map((session) => [session.id, session]));
  for (const job of jobs) {
    if (!job.local_file_uri || job.status !== "uploaded" || job.storage_path) {
      continue;
    }
    const session = job.local_session_id ? sessionById.get(job.local_session_id) : null;
    const targetPath = `${athleteId}/${job.id}_${session?.source_file_name ?? "session.fit"}`;
    await uploadLocalFile(job.local_file_uri, targetPath);
    if (session) {
      const { error: sessionError } = await supabase.from("sport_science_training_session").upsert({
        id: session.id,
        athlete_id: session.athlete_id,
        session_date: session.session_date,
        duration_s: session.duration_s,
        sport: session.sport,
        session_protocol: session.session_protocol,
        body_region: session.body_region,
        contraction_type: session.contraction_type,
        source_file_name: session.source_file_name,
        source_file_path: session.source_file_path,
        source_mime_type: session.source_mime_type,
        storage_path: targetPath,
        device: session.device,
        detected_type: session.detected_type,
        session_rpe_1_10: session.session_rpe_1_10,
        notes: session.notes,
      });
      if (sessionError) {
        throw sessionError;
      }
      const { error: jobError } = await supabase.from("sport_science_import_job").upsert({
        id: job.id,
        athlete_id: athleteId,
        session_id: session.id,
        session_date: session.session_date,
        storage_path: targetPath,
        status: "uploaded",
      });
      if (jobError) {
        throw jobError;
      }
      await markTableRowSynced(db, "sport_science_training_session", session.id);
    }
    await updateImportJob(db, job.id, { storage_path: targetPath, status: "uploaded" });
    synced += 1;
  }

  return { synced, skipped: false };
}
