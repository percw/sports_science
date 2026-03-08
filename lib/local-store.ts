import type { SQLiteDatabase } from "expo-sqlite";

import { createId } from "@/lib/ids";
import type {
  AthleteProfile,
  DailyState,
  ImportJob,
  MentalLoad,
  PerformanceAnchor,
  ReadinessSnapshot,
  SessionMarker,
  TrainingSession,
} from "@/types/domain";

export async function getActiveAthleteId(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sport_science_settings WHERE key = ?",
    ["active_athlete_id"],
  );
  return row?.value ?? null;
}

export async function setActiveAthleteId(db: SQLiteDatabase, athleteId: string) {
  await db.runAsync(
    `INSERT INTO sport_science_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ["active_athlete_id", athleteId],
  );
}

export async function saveAthleteProfile(db: SQLiteDatabase, profile: AthleteProfile) {
  await db.runAsync(
    `INSERT INTO sport_science_athlete_profile (
      id, display_name, sport_focus, baseline_ref_power_w, baseline_threshold_power_w,
      baseline_interval_power_w, preferred_ramp_day, preferred_steady_day,
      preferred_interval_day, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      sport_focus = excluded.sport_focus,
      baseline_ref_power_w = excluded.baseline_ref_power_w,
      baseline_threshold_power_w = excluded.baseline_threshold_power_w,
      baseline_interval_power_w = excluded.baseline_interval_power_w,
      preferred_ramp_day = excluded.preferred_ramp_day,
      preferred_steady_day = excluded.preferred_steady_day,
      preferred_interval_day = excluded.preferred_interval_day,
      updated_at = CURRENT_TIMESTAMP,
      sync_status = excluded.sync_status`,
    [
      profile.id,
      profile.display_name,
      profile.sport_focus,
      profile.baseline_ref_power_w ?? null,
      profile.baseline_threshold_power_w ?? null,
      profile.baseline_interval_power_w ?? null,
      profile.preferred_ramp_day ?? null,
      profile.preferred_steady_day ?? null,
      profile.preferred_interval_day ?? null,
      profile.sync_status ?? "pending",
    ],
  );
  await setActiveAthleteId(db, profile.id);
}

export async function getAthleteProfile(db: SQLiteDatabase, athleteId: string) {
  return db.getFirstAsync<AthleteProfile>(
    "SELECT * FROM sport_science_athlete_profile WHERE id = ?",
    [athleteId],
  );
}

export async function listPendingAthleteProfiles(db: SQLiteDatabase) {
  return db.getAllAsync<AthleteProfile>(
    `SELECT * FROM sport_science_athlete_profile
     WHERE sync_status = 'pending'`,
  );
}

export async function upsertDailyState(db: SQLiteDatabase, state: DailyState) {
  await db.runAsync(
    `INSERT INTO sport_science_daily_state (
      athlete_id, date, resting_hr_bpm, hrv_rmssd_ms, sleep_duration_min,
      sleep_quality_1_5, body_weight_kg, soreness_1_5, motivation_1_5,
      mood_1_5, energy_1_5, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(athlete_id, date) DO UPDATE SET
      resting_hr_bpm = excluded.resting_hr_bpm,
      hrv_rmssd_ms = excluded.hrv_rmssd_ms,
      sleep_duration_min = excluded.sleep_duration_min,
      sleep_quality_1_5 = excluded.sleep_quality_1_5,
      body_weight_kg = excluded.body_weight_kg,
      soreness_1_5 = excluded.soreness_1_5,
      motivation_1_5 = excluded.motivation_1_5,
      mood_1_5 = excluded.mood_1_5,
      energy_1_5 = excluded.energy_1_5,
      updated_at = CURRENT_TIMESTAMP,
      sync_status = excluded.sync_status`,
    [
      state.athlete_id,
      state.date,
      state.resting_hr_bpm ?? null,
      state.hrv_rmssd_ms ?? null,
      state.sleep_duration_min ?? null,
      state.sleep_quality_1_5 ?? null,
      state.body_weight_kg ?? null,
      state.soreness_1_5 ?? null,
      state.motivation_1_5 ?? null,
      state.mood_1_5 ?? null,
      state.energy_1_5 ?? null,
      state.sync_status ?? "pending",
    ],
  );
}

export async function upsertMentalLoad(db: SQLiteDatabase, mentalLoad: MentalLoad) {
  await db.runAsync(
    `INSERT INTO sport_science_mental_load (
      athlete_id, date, perceived_stress_1_5, cognitive_demand_1_5,
      emotional_valence_1_5, focus_quality_1_5, pvt_mean_rt_ms,
      pvt_lapses, notes, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(athlete_id, date) DO UPDATE SET
      perceived_stress_1_5 = excluded.perceived_stress_1_5,
      cognitive_demand_1_5 = excluded.cognitive_demand_1_5,
      emotional_valence_1_5 = excluded.emotional_valence_1_5,
      focus_quality_1_5 = excluded.focus_quality_1_5,
      pvt_mean_rt_ms = excluded.pvt_mean_rt_ms,
      pvt_lapses = excluded.pvt_lapses,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP,
      sync_status = excluded.sync_status`,
    [
      mentalLoad.athlete_id,
      mentalLoad.date,
      mentalLoad.perceived_stress_1_5 ?? null,
      mentalLoad.cognitive_demand_1_5 ?? null,
      mentalLoad.emotional_valence_1_5 ?? null,
      mentalLoad.focus_quality_1_5 ?? null,
      mentalLoad.pvt_mean_rt_ms ?? null,
      mentalLoad.pvt_lapses ?? null,
      mentalLoad.notes ?? null,
      mentalLoad.sync_status ?? "pending",
    ],
  );
}

export async function saveTrainingSession(db: SQLiteDatabase, session: TrainingSession) {
  await db.runAsync(
    `INSERT INTO sport_science_training_session (
      id, athlete_id, session_date, started_at, duration_s, sport, session_protocol,
      body_region, contraction_type, source_file_name, source_file_uri, source_file_path,
      source_mime_type, device, detected_type, session_rpe_1_10, notes, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      session_date = excluded.session_date,
      started_at = excluded.started_at,
      duration_s = excluded.duration_s,
      sport = excluded.sport,
      session_protocol = excluded.session_protocol,
      body_region = excluded.body_region,
      contraction_type = excluded.contraction_type,
      source_file_name = excluded.source_file_name,
      source_file_uri = excluded.source_file_uri,
      source_file_path = excluded.source_file_path,
      source_mime_type = excluded.source_mime_type,
      device = excluded.device,
      detected_type = excluded.detected_type,
      session_rpe_1_10 = excluded.session_rpe_1_10,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP,
      sync_status = excluded.sync_status`,
    [
      session.id,
      session.athlete_id,
      session.session_date,
      session.started_at ?? null,
      session.duration_s ?? null,
      session.sport ?? null,
      session.session_protocol,
      session.body_region ?? null,
      session.contraction_type ?? null,
      session.source_file_name ?? null,
      session.source_file_uri ?? null,
      session.source_file_path ?? null,
      session.source_mime_type ?? null,
      session.device ?? null,
      session.detected_type ?? null,
      session.session_rpe_1_10 ?? null,
      session.notes ?? null,
      session.sync_status ?? "pending",
    ],
  );
}

export async function replaceSessionMarkers(
  db: SQLiteDatabase,
  sessionId: string,
  markers: SessionMarker[],
) {
  await db.runAsync("DELETE FROM sport_science_session_marker WHERE session_id = ?", [sessionId]);
  for (const marker of markers) {
    await db.runAsync(
      `INSERT INTO sport_science_session_marker (
        id, session_id, marker_key, marker_scope, numeric_value, text_value, json_value,
        unit, stage_index, set_index, rep_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        marker.id ?? createId("marker"),
        marker.session_id,
        marker.marker_key,
        marker.marker_scope ?? null,
        marker.numeric_value ?? null,
        marker.text_value ?? null,
        marker.json_value ?? null,
        marker.unit ?? null,
        marker.stage_index ?? null,
        marker.set_index ?? null,
        marker.rep_index ?? null,
      ],
    );
  }
}

export async function createImportJob(
  db: SQLiteDatabase,
  job: Omit<ImportJob, "created_at" | "updated_at">,
) {
  await db.runAsync(
    `INSERT INTO sport_science_import_job (
      id, athlete_id, local_session_id, local_file_uri, storage_path, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id,
      job.athlete_id,
      job.local_session_id ?? null,
      job.local_file_uri ?? null,
      job.storage_path ?? null,
      job.status,
      job.error_message ?? null,
    ],
  );
}

export async function updateImportJob(
  db: SQLiteDatabase,
  jobId: string,
  values: { storage_path?: string | null; status?: string; error_message?: string | null },
) {
  await db.runAsync(
    `UPDATE sport_science_import_job
     SET storage_path = COALESCE(?, storage_path),
         status = COALESCE(?, status),
         error_message = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      values.storage_path ?? null,
      values.status ?? null,
      values.error_message ?? null,
      jobId,
    ],
  );
}

export async function listRecentImportJobs(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<ImportJob>(
    `SELECT * FROM sport_science_import_job
     WHERE athlete_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [athleteId],
  );
}

export async function listPendingImportJobs(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<ImportJob>(
    `SELECT * FROM sport_science_import_job
     WHERE athlete_id = ? AND status = 'uploaded'
     ORDER BY created_at ASC`,
    [athleteId],
  );
}

export async function listPendingDailyStates(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<DailyState>(
    `SELECT * FROM sport_science_daily_state
     WHERE athlete_id = ? AND sync_status = 'pending'
     ORDER BY date ASC`,
    [athleteId],
  );
}

export async function listPendingMentalLoads(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<MentalLoad>(
    `SELECT * FROM sport_science_mental_load
     WHERE athlete_id = ? AND sync_status = 'pending'
     ORDER BY date ASC`,
    [athleteId],
  );
}

export async function listRecentSessions(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<TrainingSession>(
    `SELECT * FROM sport_science_training_session
     WHERE athlete_id = ?
     ORDER BY session_date DESC, created_at DESC
     LIMIT 20`,
    [athleteId],
  );
}

export async function listPendingSessions(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<TrainingSession>(
    `SELECT * FROM sport_science_training_session
     WHERE athlete_id = ? AND sync_status = 'pending'
     ORDER BY session_date ASC, created_at ASC`,
    [athleteId],
  );
}

export async function getSessionById(db: SQLiteDatabase, sessionId: string) {
  return db.getFirstAsync<TrainingSession>(
    `SELECT * FROM sport_science_training_session
     WHERE id = ?
     LIMIT 1`,
    [sessionId],
  );
}

export async function getSessionMarkers(db: SQLiteDatabase, sessionId: string) {
  return db.getAllAsync<SessionMarker>(
    `SELECT * FROM sport_science_session_marker
     WHERE session_id = ?
     ORDER BY marker_key, stage_index, set_index, rep_index`,
    [sessionId],
  );
}

export async function saveReadinessSnapshot(db: SQLiteDatabase, snapshot: ReadinessSnapshot) {
  await db.runAsync(
    `INSERT INTO sport_science_readiness_snapshot (
      athlete_id, snapshot_date, model_version, readiness_score, confidence,
      aerobic_fatigue, neuromuscular_fatigue, central_fatigue, fitness,
      contributor_summary, contributor_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(athlete_id, snapshot_date, model_version) DO UPDATE SET
      readiness_score = excluded.readiness_score,
      confidence = excluded.confidence,
      aerobic_fatigue = excluded.aerobic_fatigue,
      neuromuscular_fatigue = excluded.neuromuscular_fatigue,
      central_fatigue = excluded.central_fatigue,
      fitness = excluded.fitness,
      contributor_summary = excluded.contributor_summary,
      contributor_json = excluded.contributor_json`,
    [
      snapshot.athlete_id,
      snapshot.snapshot_date,
      snapshot.model_version,
      snapshot.readiness_score,
      snapshot.confidence,
      snapshot.aerobic_fatigue,
      snapshot.neuromuscular_fatigue,
      snapshot.central_fatigue,
      snapshot.fitness,
      snapshot.contributor_summary,
      snapshot.contributor_json ?? null,
    ],
  );
}

export async function savePerformanceAnchor(db: SQLiteDatabase, anchor: PerformanceAnchor) {
  await db.runAsync(
    `INSERT INTO sport_science_performance_anchor (
      id, athlete_id, anchor_date, test_protocol, result_time_s, result_avg_power_w,
      result_peak_power_w, result_avg_hr_bpm, result_max_hr_bpm, test_rpe_1_10,
      notes, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      anchor_date = excluded.anchor_date,
      test_protocol = excluded.test_protocol,
      result_time_s = excluded.result_time_s,
      result_avg_power_w = excluded.result_avg_power_w,
      result_peak_power_w = excluded.result_peak_power_w,
      result_avg_hr_bpm = excluded.result_avg_hr_bpm,
      result_max_hr_bpm = excluded.result_max_hr_bpm,
      test_rpe_1_10 = excluded.test_rpe_1_10,
      notes = excluded.notes,
      sync_status = excluded.sync_status`,
    [
      anchor.id,
      anchor.athlete_id,
      anchor.anchor_date,
      anchor.test_protocol,
      anchor.result_time_s ?? null,
      anchor.result_avg_power_w ?? null,
      anchor.result_peak_power_w ?? null,
      anchor.result_avg_hr_bpm ?? null,
      anchor.result_max_hr_bpm ?? null,
      anchor.test_rpe_1_10 ?? null,
      anchor.notes ?? null,
      anchor.sync_status ?? "pending",
    ],
  );
}

export async function listPendingPerformanceAnchors(db: SQLiteDatabase, athleteId: string) {
  return db.getAllAsync<PerformanceAnchor>(
    `SELECT * FROM sport_science_performance_anchor
     WHERE athlete_id = ? AND sync_status = 'pending'
     ORDER BY anchor_date ASC`,
    [athleteId],
  );
}

export async function getLatestReadinessSnapshot(db: SQLiteDatabase, athleteId: string) {
  return db.getFirstAsync<ReadinessSnapshot>(
    `SELECT * FROM sport_science_readiness_snapshot
     WHERE athlete_id = ?
     ORDER BY snapshot_date DESC, created_at DESC
     LIMIT 1`,
    [athleteId],
  );
}

export async function markTableRowSynced(
  db: SQLiteDatabase,
  table: "sport_science_athlete_profile" | "sport_science_training_session",
  id: string,
) {
  await db.runAsync(
    `UPDATE ${table}
     SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id],
  );
}

export async function markDailyStateSynced(db: SQLiteDatabase, athleteId: string, date: string) {
  await db.runAsync(
    `UPDATE sport_science_daily_state
     SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
     WHERE athlete_id = ? AND date = ?`,
    [athleteId, date],
  );
}

export async function markMentalLoadSynced(db: SQLiteDatabase, athleteId: string, date: string) {
  await db.runAsync(
    `UPDATE sport_science_mental_load
     SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
     WHERE athlete_id = ? AND date = ?`,
    [athleteId, date],
  );
}

export async function markPerformanceAnchorSynced(db: SQLiteDatabase, anchorId: string) {
  await db.runAsync(
    `UPDATE sport_science_performance_anchor
     SET sync_status = 'synced'
     WHERE id = ?`,
    [anchorId],
  );
}
