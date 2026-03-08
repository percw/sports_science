import type { SQLiteDatabase } from "expo-sqlite";

const statements = [
  `CREATE TABLE IF NOT EXISTS sport_science_athlete_profile (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    sport_focus TEXT NOT NULL DEFAULT 'multisport',
    baseline_ref_power_w REAL,
    baseline_threshold_power_w REAL,
    baseline_interval_power_w REAL,
    preferred_ramp_day TEXT,
    preferred_steady_day TEXT,
    preferred_interval_day TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_daily_state (
    athlete_id TEXT NOT NULL,
    date TEXT NOT NULL,
    resting_hr_bpm REAL,
    hrv_rmssd_ms REAL,
    sleep_duration_min INTEGER,
    sleep_quality_1_5 INTEGER,
    body_weight_kg REAL,
    soreness_1_5 INTEGER,
    motivation_1_5 INTEGER,
    mood_1_5 INTEGER,
    energy_1_5 INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    PRIMARY KEY (athlete_id, date)
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_mental_load (
    athlete_id TEXT NOT NULL,
    date TEXT NOT NULL,
    perceived_stress_1_5 INTEGER,
    cognitive_demand_1_5 INTEGER,
    emotional_valence_1_5 INTEGER,
    focus_quality_1_5 INTEGER,
    pvt_mean_rt_ms REAL,
    pvt_lapses INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    PRIMARY KEY (athlete_id, date)
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_training_session (
    id TEXT PRIMARY KEY NOT NULL,
    athlete_id TEXT NOT NULL,
    session_date TEXT NOT NULL,
    started_at TEXT,
    duration_s REAL,
    sport TEXT,
    session_protocol TEXT NOT NULL DEFAULT 'unknown',
    body_region TEXT,
    contraction_type TEXT,
    source_file_name TEXT,
    source_file_uri TEXT,
    source_file_path TEXT,
    source_mime_type TEXT,
    device TEXT,
    detected_type TEXT,
    session_rpe_1_10 INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_session_interval (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    interval_type TEXT NOT NULL,
    stage_index INTEGER,
    set_index INTEGER,
    rep_index INTEGER,
    start_offset_s REAL,
    end_offset_s REAL,
    avg_power_w REAL,
    avg_hr_bpm REAL,
    peak_hr_bpm REAL,
    avg_core_temp_c REAL,
    avg_cadence_spm REAL,
    avg_drive_time_ms REAL
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_session_marker (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    marker_key TEXT NOT NULL,
    marker_scope TEXT,
    numeric_value REAL,
    text_value TEXT,
    json_value TEXT,
    unit TEXT,
    stage_index INTEGER,
    set_index INTEGER,
    rep_index INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_performance_anchor (
    id TEXT PRIMARY KEY NOT NULL,
    athlete_id TEXT NOT NULL,
    session_id TEXT,
    anchor_date TEXT NOT NULL,
    test_protocol TEXT NOT NULL,
    result_time_s REAL,
    result_avg_power_w REAL,
    result_peak_power_w REAL,
    result_avg_hr_bpm REAL,
    result_max_hr_bpm REAL,
    test_rpe_1_10 INTEGER,
    notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_derived_feature (
    athlete_id TEXT NOT NULL,
    feature_date TEXT NOT NULL,
    load_aerobic REAL NOT NULL DEFAULT 0,
    load_neuromuscular REAL NOT NULL DEFAULT 0,
    load_total REAL NOT NULL DEFAULT 0,
    mental_load REAL NOT NULL DEFAULT 0,
    sleep_quality REAL NOT NULL DEFAULT 1,
    resting_hr_bpm REAL,
    hrv_rmssd_ms REAL,
    hr_at_ref_power REAL,
    hr_drift REAL,
    core_temp_drift REAL,
    power_decrement REAL,
    set1_power REAL,
    stroke_drift REAL,
    rpe_residual REAL,
    pvt_rt REAL,
    atl_7d REAL NOT NULL DEFAULT 0,
    ctl_42d REAL NOT NULL DEFAULT 0,
    mental_load_7d_avg REAL NOT NULL DEFAULT 0,
    monotony_7d REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (athlete_id, feature_date)
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_model_run (
    id TEXT PRIMARY KEY NOT NULL,
    athlete_id TEXT NOT NULL,
    model_version TEXT NOT NULL,
    run_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fit_metadata TEXT NOT NULL DEFAULT '{}'
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_readiness_snapshot (
    athlete_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    model_version TEXT NOT NULL,
    readiness_score REAL NOT NULL,
    confidence REAL NOT NULL,
    aerobic_fatigue REAL NOT NULL,
    neuromuscular_fatigue REAL NOT NULL,
    central_fatigue REAL NOT NULL,
    fitness REAL NOT NULL,
    contributor_summary TEXT NOT NULL,
    contributor_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (athlete_id, snapshot_date, model_version)
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_import_job (
    id TEXT PRIMARY KEY NOT NULL,
    athlete_id TEXT NOT NULL,
    local_session_id TEXT,
    local_file_uri TEXT,
    storage_path TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS sport_science_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = 'wal';
    PRAGMA foreign_keys = ON;
  `);

  for (const statement of statements) {
    await db.execAsync(statement);
  }
}
