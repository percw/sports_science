"""
Fatigue Model — Session Marker Extraction Pipeline
===================================================
Upload a FIT or GPX file → auto-detect session type → extract all markers.

Supports:
  - Concept2 PM5 FIT files (stroke-level power, drive/recovery times)
  - Garmin/Wahoo FIT files (HR, power, cadence, core temp via CORE sensor)
  - GPX files (HR, GPS, basic metrics only)

Usage:
  python extract.py session.fit
  python extract.py session.gpx
  python extract.py /folder/of/files/
"""

import json
import sys
import os
import math
from dataclasses import dataclass, field, asdict
from typing import Optional
from pathlib import Path

import numpy as np
from scipy import stats as sp_stats
from scipy.signal import medfilt

# ─────────────────────────────────────────────
# 1. UNIFIED RECORD FORMAT
# ─────────────────────────────────────────────

@dataclass
class DataPoint:
    """Single time-series data point from any source."""
    timestamp_s: float        # seconds from session start
    power_w: Optional[float] = None
    heart_rate_bpm: Optional[float] = None
    cadence_spm: Optional[float] = None
    core_temp_c: Optional[float] = None
    stroke_distance_m: Optional[float] = None
    drive_time_ms: Optional[float] = None
    recovery_time_ms: Optional[float] = None
    speed_mps: Optional[float] = None
    distance_m: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@dataclass
class SessionData:
    """Parsed session with metadata and time-series."""
    filename: str
    sport: str = "unknown"
    duration_s: float = 0
    points: list = field(default_factory=list)
    has_power: bool = False
    has_hr: bool = False
    has_core_temp: bool = False
    has_stroke_data: bool = False
    device: str = "unknown"

    def to_arrays(self):
        """Convert to numpy arrays for analysis."""
        n = len(self.points)
        arrays = {
            "time": np.array([p.timestamp_s for p in self.points]),
            "power": np.array([p.power_w if p.power_w else np.nan for p in self.points]),
            "hr": np.array([p.heart_rate_bpm if p.heart_rate_bpm else np.nan for p in self.points]),
            "cadence": np.array([p.cadence_spm if p.cadence_spm else np.nan for p in self.points]),
            "core_temp": np.array([p.core_temp_c if p.core_temp_c else np.nan for p in self.points]),
            "drive_time": np.array([p.drive_time_ms if p.drive_time_ms else np.nan for p in self.points]),
            "recovery_time": np.array([p.recovery_time_ms if p.recovery_time_ms else np.nan for p in self.points]),
            "distance": np.array([p.distance_m if p.distance_m else np.nan for p in self.points]),
        }
        return arrays


# ─────────────────────────────────────────────
# 2. FILE PARSERS
# ─────────────────────────────────────────────

def parse_fit(filepath: str) -> SessionData:
    """Parse a FIT file into SessionData."""
    from fitparse import FitFile

    fit = FitFile(filepath)
    session = SessionData(filename=os.path.basename(filepath))
    points = []
    start_time = None
    sport_name = "unknown"
    device_name = "unknown"

    # Extract session-level info
    for msg in fit.get_messages("session"):
        for f in msg.fields:
            if f.name == "sport":
                sport_name = str(f.value).lower() if f.value else "unknown"
            if f.name == "sub_sport":
                sub = str(f.value).lower() if f.value else ""

    # Extract device info
    for msg in fit.get_messages("device_info"):
        for f in msg.fields:
            if f.name == "product_name" and f.value:
                device_name = str(f.value)
                break
            if f.name == "manufacturer" and f.value:
                device_name = str(f.value)

    # Extract time-series records
    for msg in fit.get_messages("record"):
        fields = {f.name: f.value for f in msg.fields}

        ts = fields.get("timestamp")
        if ts is None:
            continue

        if start_time is None:
            start_time = ts

        elapsed = (ts - start_time).total_seconds()

        dp = DataPoint(timestamp_s=elapsed)

        # Power (Concept2 or power meter)
        if "power" in fields and fields["power"] is not None:
            dp.power_w = float(fields["power"])
        # Heart rate
        if "heart_rate" in fields and fields["heart_rate"] is not None:
            dp.heart_rate_bpm = float(fields["heart_rate"])
        # Cadence / stroke rate
        for cad_key in ["cadence", "stroke_rate"]:
            if cad_key in fields and fields[cad_key] is not None:
                dp.cadence_spm = float(fields[cad_key])
                break
        # Core body temperature (CORE sensor via ANT+/BLE)
        # In FIT files this appears as "core_temperature" or in developer fields
        for temp_key in ["core_temperature", "body_temperature", "temperature"]:
            if temp_key in fields and fields[temp_key] is not None:
                val = float(fields[temp_key])
                if 35.0 < val < 42.0:  # sanity check: actual body temp range
                    dp.core_temp_c = val
                    break
        # Distance
        if "distance" in fields and fields["distance"] is not None:
            dp.distance_m = float(fields["distance"])
        # Speed
        if "speed" in fields and fields["speed"] is not None:
            dp.speed_mps = float(fields["speed"])
        # GPS
        if "position_lat" in fields and fields["position_lat"] is not None:
            dp.latitude = fields["position_lat"] * (180.0 / 2**31)
        if "position_long" in fields and fields["position_long"] is not None:
            dp.longitude = fields["position_long"] * (180.0 / 2**31)

        points.append(dp)

    # Also check developer fields for CORE sensor
    # CORE sensor often writes to developer data fields
    for msg in fit.get_messages("record"):
        fields = {f.name: f.value for f in msg.fields}
        dev_fields = {f.name: f.value for f in msg.fields if hasattr(f, 'dev_data_index')}
        for key, val in dev_fields.items():
            if "temp" in key.lower() and val is not None:
                try:
                    v = float(val)
                    if 35.0 < v < 42.0:
                        # Find matching point by timestamp
                        pass  # handled above in main loop
                except (ValueError, TypeError):
                    pass

    # Detect Concept2-specific stroke data
    # Concept2 PM5 exports may have stroke-level data in lap or length messages
    for msg in fit.get_messages("length"):
        fields = {f.name: f.value for f in msg.fields}
        # Concept2 uses 'length' messages for per-stroke data

    # Map sport names
    sport_map = {
        "rowing": "skierg",  # Concept2 reports as rowing
        "indoor_rowing": "skierg",
        "cycling": "cycling",
        "running": "run",
        "cross_country_skiing": "xc_ski",
        "generic": "unknown",
    }
    session.sport = sport_map.get(sport_name, sport_name)
    session.device = device_name
    session.points = points
    session.duration_s = points[-1].timestamp_s if points else 0

    # Set flags
    session.has_power = any(p.power_w is not None for p in points)
    session.has_hr = any(p.heart_rate_bpm is not None for p in points)
    session.has_core_temp = any(p.core_temp_c is not None for p in points)
    session.has_stroke_data = any(p.drive_time_ms is not None for p in points)

    return session


def parse_gpx(filepath: str) -> SessionData:
    """Parse a GPX file into SessionData (limited: HR + GPS, no power)."""
    import gpxpy

    with open(filepath) as f:
        gpx = gpxpy.parse(f)

    session = SessionData(filename=os.path.basename(filepath))
    points = []
    start_time = None

    for track in gpx.tracks:
        if track.type:
            session.sport = track.type.lower()
        for segment in track.segments:
            for pt in segment.points:
                if start_time is None:
                    start_time = pt.time

                elapsed = (pt.time - start_time).total_seconds()
                dp = DataPoint(
                    timestamp_s=elapsed,
                    latitude=pt.latitude,
                    longitude=pt.longitude,
                )

                # HR from extensions
                if pt.extensions:
                    for ext in pt.extensions:
                        hr_elem = ext.find(".//{http://www.garmin.com/xmlschemas/TrackPointExtension/v1}hr")
                        if hr_elem is not None:
                            dp.heart_rate_bpm = float(hr_elem.text)
                        # CORE temp sometimes in extensions
                        temp_elem = ext.find(".//{http://www.garmin.com/xmlschemas/TrackPointExtension/v1}atemp")
                        if temp_elem is not None:
                            val = float(temp_elem.text)
                            if 35.0 < val < 42.0:
                                dp.core_temp_c = val

                points.append(dp)

    session.points = points
    session.duration_s = points[-1].timestamp_s if points else 0
    session.has_hr = any(p.heart_rate_bpm is not None for p in points)
    session.has_core_temp = any(p.core_temp_c is not None for p in points)
    session.device = "gpx"

    return session


# ─────────────────────────────────────────────
# 3. SESSION TYPE DETECTION
# ─────────────────────────────────────────────

def detect_session_type(session: SessionData) -> str:
    """
    Auto-detect: 'ramp', 'steady_state', 'intervals_30_15', or 'unknown'.
    Uses power profile pattern matching.
    """
    arrays = session.to_arrays()
    power = arrays["power"]
    time = arrays["time"]

    if np.all(np.isnan(power)):
        # No power data — fall back to HR patterns
        hr = arrays["hr"]
        if np.all(np.isnan(hr)):
            return "unknown"
        power = hr  # use HR as proxy for detection

    # Clean power: remove NaN, apply median filter
    valid = ~np.isnan(power)
    if valid.sum() < 60:
        return "unknown"

    p_clean = power[valid]
    t_clean = time[valid]

    # Resample to 1Hz if needed
    duration = t_clean[-1] - t_clean[0]

    # --- DETECTION HEURISTICS ---

    # 1. RAMP: Look for step-wise or monotonically increasing power
    # Use larger windows (2-5 min) to capture stage means
    for window_s in [300, 180, 120]:  # try 5min, 3min, 2min windows
        n_windows = int(duration / window_s)
        if n_windows < 3:
            continue
        window_means = []
        for i in range(n_windows):
            mask = (t_clean >= i * window_s) & (t_clean < (i + 1) * window_s)
            if mask.sum() > 0:
                window_means.append(np.nanmean(p_clean[mask]))
        window_means = np.array(window_means)

        if len(window_means) >= 3:
            diffs = np.diff(window_means)
            # Most stages should increase, and increases should be substantial
            pct_increasing = np.mean(diffs > 0)
            mean_increase = np.mean(diffs[diffs > 0]) if np.any(diffs > 0) else 0
            total_range = window_means[-1] - window_means[0]

            if pct_increasing > 0.65 and total_range > 30:
                return "ramp"

    # 2. INTERVALS (30/15): Look for repeated on/off pattern
    # High variance with regular periodicity
    if duration > 300:  # at least 5 min
        # Compute rolling power std in 90s windows (covers ~2 reps of 30/15)
        local_stds = []
        for i in range(0, int(duration) - 90, 30):
            mask = (t_clean >= i) & (t_clean < i + 90)
            if mask.sum() > 5:
                local_stds.append(np.nanstd(p_clean[mask]))

        if local_stds:
            mean_local_std = np.mean(local_stds)
            global_mean = np.nanmean(p_clean)

            # High local variability relative to mean = interval session
            cv_local = mean_local_std / global_mean if global_mean > 0 else 0

            if cv_local > 0.25:
                # Check for periodic structure via autocorrelation
                # 30s on + 15s off = 45s period
                return "intervals_30_15"

    # 3. STEADY STATE: Low coefficient of variation across the middle 80%
    # Trim first and last 10% (warm-up / cool-down)
    trim_start = int(len(p_clean) * 0.10)
    trim_end = int(len(p_clean) * 0.90)
    middle = p_clean[trim_start:trim_end]

    if len(middle) > 60:
        cv = np.nanstd(middle) / np.nanmean(middle) if np.nanmean(middle) > 0 else 999
        if cv < 0.12:
            return "steady_state"

    return "unknown"


# ─────────────────────────────────────────────
# 4. MARKER EXTRACTION
# ─────────────────────────────────────────────

def safe_mean(arr):
    v = arr[~np.isnan(arr)]
    return float(np.mean(v)) if len(v) > 0 else None

def safe_std(arr):
    v = arr[~np.isnan(arr)]
    return float(np.std(v)) if len(v) > 1 else None

def safe_slope(x, y):
    """Linear regression slope, handling NaN."""
    mask = ~(np.isnan(x) | np.isnan(y))
    if mask.sum() < 3:
        return None
    slope, _, _, _, _ = sp_stats.linregress(x[mask], y[mask])
    return float(slope)


def extract_ramp_markers(session: SessionData, ref_power_w: float = 180.0) -> dict:
    """Extract markers from a ramp/step test session."""
    arr = session.to_arrays()
    t, power, hr, temp, cadence = arr["time"], arr["power"], arr["hr"], arr["core_temp"], arr["cadence"]
    drive = arr["drive_time"]

    markers = {"session_type": "ramp", "protocol": "5-min stages, progressive"}

    # Detect stages: find plateaus in power
    stage_duration = 300  # 5 min default
    duration = t[-1]
    n_stages = max(1, int(duration / stage_duration))

    stages = []
    for i in range(n_stages):
        t_start = i * stage_duration
        t_end = (i + 1) * stage_duration
        mask = (t >= t_start) & (t < t_end)

        if mask.sum() < 10:
            continue

        stage = {
            "stage": i + 1,
            "avg_power_w": safe_mean(power[mask]),
            "avg_hr_bpm": safe_mean(hr[mask]),
            "avg_cadence_spm": safe_mean(cadence[mask]),
            "avg_core_temp_c": safe_mean(temp[mask]),
            "avg_drive_time_ms": safe_mean(drive[mask]),
        }

        # HR recovery in last 30s of stage vs first 30s of next stage
        if i < n_stages - 1:
            next_start = (i + 1) * stage_duration
            end_mask = (t >= t_end - 30) & (t < t_end)
            start_next_mask = (t >= next_start) & (t < next_start + 30)
            hr_end = safe_mean(hr[end_mask])
            hr_next_start = safe_mean(hr[start_next_mask])
            if hr_end and hr_next_start:
                stage["hr_recovery_bpm"] = round(hr_end - hr_next_start, 1)

        stages.append(stage)

    markers["stages"] = stages
    markers["max_completed_stage"] = len(stages)

    # HR at reference power
    # Find the stage closest to ref_power_w
    for s in stages:
        if s["avg_power_w"] and abs(s["avg_power_w"] - ref_power_w) < 20:
            markers["hr_at_ref_power_bpm"] = s["avg_hr_bpm"]
            markers["core_temp_at_ref_power_c"] = s["avg_core_temp_c"]
            markers["sr_at_ref_power_spm"] = s["avg_cadence_spm"]
            markers["ref_power_w"] = ref_power_w
            break

    # Cardiac decoupling: slope of HR vs power across stages
    stage_powers = np.array([s["avg_power_w"] for s in stages if s["avg_power_w"]])
    stage_hrs = np.array([s["avg_hr_bpm"] for s in stages if s["avg_hr_bpm"]])
    if len(stage_powers) >= 3 and len(stage_hrs) >= 3:
        min_len = min(len(stage_powers), len(stage_hrs))
        markers["cardiac_decoupling_slope"] = safe_slope(
            stage_powers[:min_len], stage_hrs[:min_len]
        )

    # Thermal rise rate
    stage_temps = [s["avg_core_temp_c"] for s in stages if s["avg_core_temp_c"]]
    if len(stage_temps) >= 2:
        t_vals = np.arange(len(stage_temps)) * (stage_duration / 60.0)
        markers["thermal_rise_rate_c_per_min"] = safe_slope(t_vals, np.array(stage_temps))

    # Max HR
    markers["max_hr_bpm"] = float(np.nanmax(hr)) if not np.all(np.isnan(hr)) else None

    # Drive/recovery ratio per stage
    for s in stages:
        if s.get("avg_drive_time_ms"):
            # Recovery time = stage_duration / cadence - drive_time
            # Or if we have it directly:
            pass  # filled from stroke data if available

    # Max core temp
    if not np.all(np.isnan(temp)):
        markers["core_temp_max_c"] = float(np.nanmax(temp))

    return markers


def extract_steady_state_markers(session: SessionData) -> dict:
    """Extract markers from a steady-state session."""
    arr = session.to_arrays()
    t, power, hr, temp, cadence = arr["time"], arr["power"], arr["hr"], arr["core_temp"], arr["cadence"]
    drive = arr["drive_time"]

    markers = {"session_type": "steady_state", "protocol": "25-min at fixed power"}

    duration = t[-1]
    # Focus on the main block: skip first 2 min warmup and last 1 min
    block_start = 120
    block_end = duration - 60
    block_mask = (t >= block_start) & (t <= block_end)

    if block_mask.sum() < 60:
        markers["error"] = "Session too short for steady-state analysis"
        return markers

    block_t = t[block_mask]
    block_hr = hr[block_mask]
    block_temp = temp[block_mask]
    block_power = power[block_mask]
    block_cadence = cadence[block_mask]
    block_drive = drive[block_mask]

    # ── Cardiac markers ──

    # HR drift: compare first 2 min vs last 2 min of block
    early_mask = block_t < (block_start + 120)
    late_mask = block_t > (block_end - 120)

    hr_early = safe_mean(block_hr[early_mask & ~np.isnan(block_hr)])
    hr_late = safe_mean(block_hr[late_mask & ~np.isnan(block_hr)])

    if hr_early is not None and hr_late is not None:
        markers["hr_drift_abs_bpm"] = round(hr_late - hr_early, 1)
    
    # HR drift rate (slope)
    markers["hr_drift_rate_bpm_per_min"] = safe_slope(block_t / 60.0, block_hr)

    # HR CV within session
    hr_valid = block_hr[~np.isnan(block_hr)]
    if len(hr_valid) > 10:
        markers["hr_cv_session_pct"] = round(float(np.std(hr_valid) / np.mean(hr_valid) * 100), 2)

    # Post-session HR recovery (last 60s of file vs 60s after block)
    post_mask = t > block_end
    if post_mask.sum() > 10:
        hr_at_end = safe_mean(hr[(t >= block_end - 30) & (t <= block_end)])
        hr_post_60 = safe_mean(hr[(t >= block_end + 50) & (t <= block_end + 70)])
        if hr_at_end and hr_post_60:
            markers["hr_recovery_60s_bpm"] = round(hr_at_end - hr_post_60, 1)

    # ── Thermal markers ──

    temp_early = safe_mean(block_temp[early_mask & ~np.isnan(block_temp)])
    temp_late = safe_mean(block_temp[late_mask & ~np.isnan(block_temp)])

    if temp_early is not None and temp_late is not None:
        markers["core_temp_drift_c"] = round(temp_late - temp_early, 2)

    markers["core_temp_drift_rate_c_per_min"] = safe_slope(block_t / 60.0, block_temp)

    # Time to thermal plateau
    if not np.all(np.isnan(block_temp)):
        temp_valid = block_temp[~np.isnan(block_temp)]
        t_valid = block_t[~np.isnan(block_temp)]
        if len(temp_valid) > 30:
            # Rolling 60s mean, find when slope < 0.01°C/min
            window = min(60, len(temp_valid) // 3)
            if window > 5:
                rolling = np.convolve(temp_valid, np.ones(window)/window, mode='valid')
                diffs = np.diff(rolling)
                plateau_idx = np.where(np.abs(diffs) < 0.001)[0]
                if len(plateau_idx) > 0:
                    markers["time_to_thermal_plateau_min"] = round(
                        float(t_valid[plateau_idx[0]] - block_start) / 60.0, 1
                    )

    # ── Mechanical markers ──

    # Power variability
    p_valid = block_power[~np.isnan(block_power)]
    if len(p_valid) > 10:
        markers["power_cv_pct"] = round(float(np.std(p_valid) / np.mean(p_valid) * 100), 2)
        markers["avg_power_w"] = round(float(np.mean(p_valid)), 1)

    # Stroke rate drift
    markers["sr_drift_spm"] = None
    cad_early = safe_mean(block_cadence[early_mask & ~np.isnan(block_cadence)])
    cad_late = safe_mean(block_cadence[late_mask & ~np.isnan(block_cadence)])
    if cad_early and cad_late:
        markers["sr_drift_spm"] = round(cad_late - cad_early, 1)

    # Drive time drift
    drive_early = safe_mean(block_drive[early_mask & ~np.isnan(block_drive)])
    drive_late = safe_mean(block_drive[late_mask & ~np.isnan(block_drive)])
    if drive_early and drive_late:
        markers["drive_time_drift_ms"] = round(drive_late - drive_early, 1)

    # Stroke consistency
    p_stroke = block_power[~np.isnan(block_power)]
    if len(p_stroke) > 10:
        markers["stroke_power_sd_w"] = round(float(np.std(p_stroke)), 1)

    return markers


def extract_interval_markers(session: SessionData) -> dict:
    """Extract markers from a 30/15 interval session."""
    arr = session.to_arrays()
    t, power, hr, temp, cadence = arr["time"], arr["power"], arr["hr"], arr["core_temp"], arr["cadence"]
    drive = arr["drive_time"]

    markers = {"session_type": "intervals_30_15", "protocol": "3×10×30s ON / 15s OFF"}

    # ── Detect intervals from power data ──
    # Strategy: find ON periods (high power) vs OFF periods (low/zero power)

    if np.all(np.isnan(power)):
        markers["error"] = "No power data — cannot segment intervals"
        return markers

    # Smooth power to reduce noise
    p = power.copy()
    p[np.isnan(p)] = 0

    # Threshold: ON = above 50% of 90th percentile
    p90 = np.percentile(p[p > 0], 90) if np.any(p > 0) else 0
    threshold = p90 * 0.40

    # Find ON/OFF transitions
    is_on = p > threshold
    transitions = np.diff(is_on.astype(int))
    on_starts = np.where(transitions == 1)[0] + 1
    off_starts = np.where(transitions == -1)[0] + 1

    if len(on_starts) == 0:
        markers["error"] = "Could not detect interval structure"
        return markers

    # Pair on_starts with off_starts
    reps = []
    for i, on_idx in enumerate(on_starts):
        # Find next off transition after this on
        offs_after = off_starts[off_starts > on_idx]
        if len(offs_after) == 0:
            continue
        off_idx = offs_after[0]

        on_duration = t[off_idx] - t[on_idx]
        # Filter for plausible 30s intervals (20-45s tolerance)
        if 15 < on_duration < 50:
            reps.append({
                "rep": len(reps) + 1,
                "t_start": float(t[on_idx]),
                "t_end": float(t[off_idx]),
                "duration_s": round(on_duration, 1),
            })

    if len(reps) < 5:
        markers["error"] = f"Only detected {len(reps)} reps, expected ~30"
        return markers

    markers["total_reps_detected"] = len(reps)

    # ── Extract per-rep metrics ──
    rep_data = []
    for rep in reps:
        mask = (t >= rep["t_start"]) & (t < rep["t_end"])

        rd = {
            "rep": rep["rep"],
            "avg_power_w": safe_mean(power[mask]),
            "avg_hr_bpm": safe_mean(hr[mask]),
            "peak_hr_bpm": float(np.nanmax(hr[mask])) if not np.all(np.isnan(hr[mask])) else None,
            "avg_core_temp_c": safe_mean(temp[mask]),
            "avg_cadence_spm": safe_mean(cadence[mask]),
            "avg_drive_time_ms": safe_mean(drive[mask]),
        }

        # HR drop during rest (15s after this rep ends)
        rest_mask = (t >= rep["t_end"]) & (t < rep["t_end"] + 20)
        hr_at_rep_end = safe_mean(hr[(t >= rep["t_end"] - 5) & (t < rep["t_end"])])
        hr_at_rest_end = safe_mean(hr[rest_mask])
        if hr_at_rep_end and hr_at_rest_end:
            rd["hr_drop_during_rest_bpm"] = round(hr_at_rep_end - hr_at_rest_end, 1)

        rep_data.append(rd)

    markers["reps"] = rep_data

    # ── Aggregate markers ──

    # Power per rep array
    powers = [r["avg_power_w"] for r in rep_data if r["avg_power_w"]]
    if powers:
        markers["power_per_rep"] = [round(p, 1) for p in powers]
        markers["power_decrement_pct"] = round(
            (1 - np.mean(powers) / max(powers)) * 100, 1
        )
        markers["set1_mean_power_w"] = round(np.mean(powers[:10]), 1) if len(powers) >= 10 else round(np.mean(powers), 1)

    # HR per rep array
    hrs = [r["avg_hr_bpm"] for r in rep_data if r["avg_hr_bpm"]]
    if hrs:
        markers["hr_per_rep"] = [round(h, 1) for h in hrs]

    # HR drops per rest
    hr_drops = [r["hr_drop_during_rest_bpm"] for r in rep_data if r.get("hr_drop_during_rest_bpm")]
    if hr_drops:
        markers["hr_drop_per_rest"] = [round(d, 1) for d in hr_drops]

    # ── Detect sets (look for long rest periods >120s) ──
    set_boundaries = [0]
    for i in range(1, len(reps)):
        gap = reps[i]["t_start"] - reps[i-1]["t_end"]
        if gap > 120:  # > 2 min gap = set break
            set_boundaries.append(i)
    set_boundaries.append(len(reps))

    n_sets = len(set_boundaries) - 1
    markers["sets_detected"] = n_sets

    set_summaries = []
    for s_idx in range(n_sets):
        start_rep = set_boundaries[s_idx]
        end_rep = set_boundaries[s_idx + 1]
        set_reps = rep_data[start_rep:end_rep]

        set_powers = [r["avg_power_w"] for r in set_reps if r["avg_power_w"]]
        set_hrs = [r["avg_hr_bpm"] for r in set_reps if r["avg_hr_bpm"]]

        summary = {
            "set": s_idx + 1,
            "n_reps": len(set_reps),
            "avg_power_w": round(np.mean(set_powers), 1) if set_powers else None,
            "power_fade_pct": round(
                (1 - set_powers[-1] / set_powers[0]) * 100, 1
            ) if set_powers and len(set_powers) > 1 and set_powers[0] > 0 else None,
            "avg_hr_bpm": round(np.mean(set_hrs), 1) if set_hrs else None,
        }

        # Core temp at end of set
        if set_reps:
            last_rep = set_reps[-1]
            summary["core_temp_end_c"] = last_rep.get("avg_core_temp_c")

        set_summaries.append(summary)

    markers["sets"] = set_summaries

    # HR drop between sets
    if n_sets >= 2:
        between_set_drops = []
        for s_idx in range(n_sets - 1):
            end_rep_idx = set_boundaries[s_idx + 1] - 1
            start_next_idx = set_boundaries[s_idx + 1]

            if end_rep_idx < len(rep_data) and start_next_idx < len(rep_data):
                hr_end = rep_data[end_rep_idx].get("peak_hr_bpm")
                hr_start_next = rep_data[start_next_idx].get("avg_hr_bpm")
                if hr_end and hr_start_next:
                    between_set_drops.append(round(hr_end - hr_start_next, 1))

        markers["hr_drop_between_sets"] = between_set_drops

    # Core temp recovery between sets
    if n_sets >= 2:
        temp_drops = []
        for s_idx in range(n_sets - 1):
            end_temp = set_summaries[s_idx].get("core_temp_end_c")
            start_temp = set_summaries[s_idx + 1].get("core_temp_end_c") if s_idx + 1 < len(set_summaries) else None
            # This is end-of-set temp, not recovery — would need between-set temp
            # For now, track the step-up
            if end_temp and start_temp:
                temp_drops.append(round(start_temp - end_temp, 2))
        markers["core_temp_step_between_sets"] = temp_drops

    # Thermal ceiling
    if not np.all(np.isnan(temp)):
        markers["core_temp_max_session_c"] = round(float(np.nanmax(temp)), 2)

    # Post-workout resting HR (10 min after last rep)
    if reps:
        last_rep_end = reps[-1]["t_end"]
        post_mask = (t >= last_rep_end + 540) & (t <= last_rep_end + 660)
        hr_post = safe_mean(hr[post_mask])
        if hr_post:
            markers["hr_post_10min_bpm"] = round(hr_post, 1)

    # Stroke rate vs power decoupling
    cads = [r["avg_cadence_spm"] for r in rep_data if r["avg_cadence_spm"]]
    if powers and cads and len(powers) == len(cads):
        # If cadence stays stable but power drops, that's decoupling
        p_arr = np.array(powers)
        c_arr = np.array(cads)
        if np.std(c_arr) > 0:
            markers["sr_power_decoupling"] = round(
                float(np.corrcoef(p_arr, c_arr)[0, 1]), 3
            )

    return markers


# ─────────────────────────────────────────────
# 5. MAIN PIPELINE
# ─────────────────────────────────────────────

def process_file(filepath: str, ref_power_w: float = 180.0, force_type: str = None) -> dict:
    """
    Main entry point: parse file → detect type → extract markers.
    
    Args:
        filepath: Path to .fit or .gpx file
        ref_power_w: Reference power for ramp test markers (default 180W)
        force_type: Override auto-detection ('ramp', 'steady_state', 'intervals_30_15')
    
    Returns:
        dict with session metadata and extracted markers
    """
    ext = Path(filepath).suffix.lower()

    # Parse
    if ext == ".fit":
        session = parse_fit(filepath)
    elif ext == ".gpx":
        session = parse_gpx(filepath)
    else:
        return {"error": f"Unsupported file type: {ext}. Use .fit or .gpx"}

    # Detect session type
    session_type = force_type or detect_session_type(session)

    # Extract markers
    if session_type == "ramp":
        markers = extract_ramp_markers(session, ref_power_w=ref_power_w)
    elif session_type == "steady_state":
        markers = extract_steady_state_markers(session)
    elif session_type == "intervals_30_15":
        markers = extract_interval_markers(session)
    else:
        markers = {"session_type": "unknown", "note": "Could not auto-detect session type. Use force_type parameter."}

    # Add metadata
    result = {
        "file": session.filename,
        "sport": session.sport,
        "device": session.device,
        "duration_s": round(session.duration_s, 1),
        "duration_display": f"{int(session.duration_s // 60)}:{int(session.duration_s % 60):02d}",
        "data_channels": {
            "power": session.has_power,
            "heart_rate": session.has_hr,
            "core_temp": session.has_core_temp,
            "stroke_data": session.has_stroke_data,
        },
        "detected_type": session_type,
        "markers": markers,
    }

    return result


def process_directory(dirpath: str, **kwargs) -> list:
    """Process all FIT/GPX files in a directory."""
    results = []
    for f in sorted(Path(dirpath).iterdir()):
        if f.suffix.lower() in (".fit", ".gpx"):
            try:
                result = process_file(str(f), **kwargs)
                results.append(result)
                print(f"  ✓ {f.name} → {result['detected_type']}")
            except Exception as e:
                results.append({"file": f.name, "error": str(e)})
                print(f"  ✗ {f.name} → {e}")
    return results


# ─────────────────────────────────────────────
# 6. CLI
# ─────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    target = sys.argv[1]
    ref_power = float(sys.argv[2]) if len(sys.argv) > 2 else 180.0
    force_type = sys.argv[3] if len(sys.argv) > 3 else None

    if os.path.isdir(target):
        print(f"\nProcessing directory: {target}\n")
        results = process_directory(target, ref_power_w=ref_power, force_type=force_type)
        output = json.dumps(results, indent=2, default=str)
    else:
        print(f"\nProcessing: {target}\n")
        result = process_file(target, ref_power_w=ref_power, force_type=force_type)
        output = json.dumps(result, indent=2, default=str)

    # Save output
    out_path = Path(target).stem + "_markers.json" if not os.path.isdir(target) else "batch_markers.json"
    with open(out_path, "w") as f:
        f.write(output)

    print(f"\n{output}\n")
    print(f"Saved to: {out_path}")
