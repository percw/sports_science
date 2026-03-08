create extension if not exists pgcrypto;

create table if not exists sport_science_athlete_profile (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  sport_focus text not null default 'multisport',
  baseline_ref_power_w double precision,
  baseline_threshold_power_w double precision,
  baseline_interval_power_w double precision,
  preferred_ramp_day text,
  preferred_steady_day text,
  preferred_interval_day text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sport_science_daily_state (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  date date not null,
  resting_hr_bpm double precision,
  hrv_rmssd_ms double precision,
  sleep_duration_min integer,
  sleep_quality_1_5 integer check (sleep_quality_1_5 between 1 and 5),
  body_weight_kg double precision,
  soreness_1_5 integer check (soreness_1_5 between 1 and 5),
  motivation_1_5 integer check (motivation_1_5 between 1 and 5),
  mood_1_5 integer check (mood_1_5 between 1 and 5),
  energy_1_5 integer check (energy_1_5 between 1 and 5),
  sync_source text default 'mobile',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, date)
);

create table if not exists sport_science_mental_load (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  date date not null,
  perceived_stress_1_5 integer check (perceived_stress_1_5 between 1 and 5),
  cognitive_demand_1_5 integer check (cognitive_demand_1_5 between 1 and 5),
  emotional_valence_1_5 integer check (emotional_valence_1_5 between 1 and 5),
  focus_quality_1_5 integer check (focus_quality_1_5 between 1 and 5),
  pvt_mean_rt_ms double precision,
  pvt_lapses integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, date)
);

create table if not exists sport_science_training_session (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  session_date date not null,
  started_at timestamptz,
  duration_s double precision,
  sport text,
  session_protocol text not null default 'unknown',
  body_region text,
  contraction_type text,
  source_file_name text,
  source_file_path text,
  source_mime_type text,
  storage_path text,
  device text,
  detected_type text,
  session_rpe_1_10 integer check (session_rpe_1_10 between 1 and 10),
  notes text,
  raw_summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sport_science_session_interval (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  session_id uuid not null references sport_science_training_session(id) on delete cascade,
  interval_type text not null,
  stage_index integer,
  set_index integer,
  rep_index integer,
  start_offset_s double precision,
  end_offset_s double precision,
  avg_power_w double precision,
  avg_hr_bpm double precision,
  peak_hr_bpm double precision,
  avg_core_temp_c double precision,
  avg_cadence_spm double precision,
  avg_drive_time_ms double precision
);

create table if not exists sport_science_session_marker (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  session_id uuid not null references sport_science_training_session(id) on delete cascade,
  marker_key text not null,
  marker_scope text not null default 'session',
  numeric_value double precision,
  text_value text,
  json_value jsonb,
  unit text,
  stage_index integer,
  set_index integer,
  rep_index integer
);

create table if not exists sport_science_performance_anchor (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  session_id uuid references sport_science_training_session(id) on delete set null,
  anchor_date date not null,
  test_protocol text not null,
  result_time_s double precision,
  result_avg_power_w double precision,
  result_peak_power_w double precision,
  result_avg_hr_bpm double precision,
  result_max_hr_bpm double precision,
  test_rpe_1_10 integer check (test_rpe_1_10 between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sport_science_derived_feature (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  feature_date date not null,
  load_aerobic double precision not null default 0,
  load_neuromuscular double precision not null default 0,
  load_total double precision not null default 0,
  mental_load double precision not null default 0,
  sleep_quality double precision not null default 1,
  resting_hr_bpm double precision,
  hrv_rmssd_ms double precision,
  hr_at_ref_power double precision,
  hr_drift double precision,
  core_temp_drift double precision,
  power_decrement double precision,
  set1_power double precision,
  stroke_drift double precision,
  rpe_residual double precision,
  pvt_rt double precision,
  atl_7d double precision not null default 0,
  ctl_42d double precision not null default 0,
  mental_load_7d_avg double precision not null default 0,
  monotony_7d double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, feature_date)
);

create table if not exists sport_science_model_run (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  model_version text not null,
  run_started_at timestamptz not null default now(),
  fit_metadata jsonb not null default '{}'::jsonb
);

create table if not exists sport_science_readiness_snapshot (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  snapshot_date date not null,
  model_version text not null,
  readiness_score double precision not null,
  confidence double precision not null,
  aerobic_fatigue double precision not null,
  neuromuscular_fatigue double precision not null,
  central_fatigue double precision not null,
  fitness double precision not null,
  contributor_summary text not null,
  contributor_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (athlete_id, snapshot_date, model_version)
);

create table if not exists sport_science_import_job (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references sport_science_athlete_profile(id) on delete cascade,
  session_id uuid references sport_science_training_session(id) on delete set null,
  session_date date,
  storage_path text,
  status text not null check (status in ('uploaded', 'parsed', 'review_required', 'ready_for_model', 'scored', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sport_science_daily_state_athlete_date_idx
  on sport_science_daily_state (athlete_id, date desc);
create index if not exists sport_science_mental_load_athlete_date_idx
  on sport_science_mental_load (athlete_id, date desc);
create index if not exists sport_science_training_session_athlete_date_idx
  on sport_science_training_session (athlete_id, session_date desc);
create index if not exists sport_science_session_marker_session_idx
  on sport_science_session_marker (session_id, marker_key);
create index if not exists sport_science_interval_session_idx
  on sport_science_session_interval (session_id, interval_type);
create index if not exists sport_science_readiness_athlete_date_idx
  on sport_science_readiness_snapshot (athlete_id, snapshot_date desc);
create index if not exists sport_science_import_job_status_idx
  on sport_science_import_job (status, created_at);
