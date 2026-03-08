export type SyncStatus = "pending" | "synced" | "failed";

export type ImportJobStatus =
  | "uploaded"
  | "parsed"
  | "review_required"
  | "ready_for_model"
  | "scored"
  | "failed";

export type SessionProtocol =
  | "ramp"
  | "steady_state"
  | "intervals_30_15"
  | "performance_anchor"
  | "unknown";

export type MarkerValue = number | string | boolean | null | Record<string, unknown> | unknown[];

export interface AthleteProfile {
  id: string;
  display_name: string;
  sport_focus: string;
  baseline_ref_power_w?: number | null;
  baseline_threshold_power_w?: number | null;
  baseline_interval_power_w?: number | null;
  preferred_ramp_day?: string | null;
  preferred_steady_day?: string | null;
  preferred_interval_day?: string | null;
  created_at?: string;
  updated_at?: string;
  sync_status?: SyncStatus;
}

export interface DailyState {
  athlete_id: string;
  date: string;
  resting_hr_bpm?: number | null;
  hrv_rmssd_ms?: number | null;
  sleep_duration_min?: number | null;
  sleep_quality_1_5?: number | null;
  body_weight_kg?: number | null;
  soreness_1_5?: number | null;
  motivation_1_5?: number | null;
  mood_1_5?: number | null;
  energy_1_5?: number | null;
  sync_status?: SyncStatus;
}

export interface MentalLoad {
  athlete_id: string;
  date: string;
  perceived_stress_1_5?: number | null;
  cognitive_demand_1_5?: number | null;
  emotional_valence_1_5?: number | null;
  focus_quality_1_5?: number | null;
  pvt_mean_rt_ms?: number | null;
  pvt_lapses?: number | null;
  notes?: string | null;
  sync_status?: SyncStatus;
}

export interface TrainingSession {
  id: string;
  athlete_id: string;
  session_date: string;
  started_at?: string | null;
  duration_s?: number | null;
  sport?: string | null;
  session_protocol: SessionProtocol;
  body_region?: string | null;
  contraction_type?: string | null;
  source_file_name?: string | null;
  source_file_uri?: string | null;
  source_file_path?: string | null;
  source_mime_type?: string | null;
  device?: string | null;
  detected_type?: string | null;
  session_rpe_1_10?: number | null;
  notes?: string | null;
  sync_status?: SyncStatus;
}

export interface SessionMarker {
  id?: string;
  session_id: string;
  marker_key: string;
  marker_scope?: string | null;
  numeric_value?: number | null;
  text_value?: string | null;
  json_value?: string | null;
  unit?: string | null;
  stage_index?: number | null;
  set_index?: number | null;
  rep_index?: number | null;
}

export interface ReadinessSnapshot {
  athlete_id: string;
  snapshot_date: string;
  model_version: string;
  readiness_score: number;
  confidence: number;
  aerobic_fatigue: number;
  neuromuscular_fatigue: number;
  central_fatigue: number;
  fitness: number;
  contributor_summary: string;
  contributor_json?: string | null;
}

export interface ImportJob {
  id: string;
  athlete_id: string;
  local_session_id?: string | null;
  local_file_uri?: string | null;
  storage_path?: string | null;
  status: ImportJobStatus;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PerformanceAnchor {
  id: string;
  athlete_id: string;
  anchor_date: string;
  test_protocol: string;
  result_time_s?: number | null;
  result_avg_power_w?: number | null;
  result_peak_power_w?: number | null;
  result_avg_hr_bpm?: number | null;
  result_max_hr_bpm?: number | null;
  test_rpe_1_10?: number | null;
  notes?: string | null;
  sync_status?: SyncStatus;
}
