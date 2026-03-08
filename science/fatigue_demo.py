"""
Demo: Generate synthetic sessions and run marker extraction.
Run this to verify the pipeline works before using real FIT files.
"""
import json
import numpy as np
import sys
sys.path.insert(0, ".")

try:
    from .fatigue_extract import (
        SessionData, DataPoint, detect_session_type,
        extract_ramp_markers, extract_steady_state_markers, extract_interval_markers
    )
except ImportError:  # pragma: no cover - direct script execution
    from fatigue_extract import (
        SessionData, DataPoint, detect_session_type,
        extract_ramp_markers, extract_steady_state_markers, extract_interval_markers
    )


def generate_ramp_session(fatigued=False) -> SessionData:
    """Simulate a ramp test: 5-min stages at 120, 150, 180, 210, 240W."""
    session = SessionData(filename="ramp_test_sim.fit", sport="skierg", device="concept2_pm5")
    points = []

    stages_w = [120, 150, 180, 210, 240]
    base_hr = [125, 140, 155, 168, 178]
    base_temp = [37.1, 37.3, 37.6, 38.0, 38.5]

    if fatigued:
        # Fatigued: higher HR at same power, faster temp rise, fail at stage 4
        base_hr = [132, 148, 164, 179]  # one fewer stage
        base_temp = [37.3, 37.6, 38.1, 38.7]
        stages_w = stages_w[:4]

    for stage_idx, (pw, hr, tmp) in enumerate(zip(stages_w, base_hr, base_temp)):
        for sec in range(300):  # 5 min per stage
            t = stage_idx * 300 + sec
            points.append(DataPoint(
                timestamp_s=float(t),
                power_w=pw + np.random.normal(0, 3),
                heart_rate_bpm=hr + sec * 0.01 + np.random.normal(0, 1),
                core_temp_c=tmp + sec * 0.0003 + np.random.normal(0, 0.02),
                cadence_spm=26 + stage_idx * 1.5 + np.random.normal(0, 0.3),
                drive_time_ms=700 - stage_idx * 20 + np.random.normal(0, 10),
            ))

    session.points = points
    session.duration_s = points[-1].timestamp_s
    session.has_power = True
    session.has_hr = True
    session.has_core_temp = True
    session.has_stroke_data = True
    return session


def generate_steady_state_session(fatigued=False) -> SessionData:
    """Simulate 25 min at ~200W steady state."""
    session = SessionData(filename="steady_state_sim.fit", sport="skierg", device="concept2_pm5")
    points = []

    target_power = 200
    base_hr = 148 if not fatigued else 155
    hr_drift_rate = 0.015 if not fatigued else 0.035  # bpm per second
    temp_start = 37.2 if not fatigued else 37.4
    temp_drift_rate = 0.00015 if not fatigued else 0.00035

    for sec in range(1500):  # 25 min
        points.append(DataPoint(
            timestamp_s=float(sec),
            power_w=target_power + np.random.normal(0, 5),
            heart_rate_bpm=base_hr + sec * hr_drift_rate + np.random.normal(0, 0.8),
            core_temp_c=temp_start + sec * temp_drift_rate + np.random.normal(0, 0.015),
            cadence_spm=27.5 + sec * 0.0005 + np.random.normal(0, 0.2),
            drive_time_ms=680 + sec * 0.01 + np.random.normal(0, 8),
        ))

    # Add 2 min cooldown
    for sec in range(120):
        t = 1500 + sec
        points.append(DataPoint(
            timestamp_s=float(t),
            power_w=50 + np.random.normal(0, 5),
            heart_rate_bpm=base_hr + 1500 * hr_drift_rate - sec * 0.3 + np.random.normal(0, 1),
            core_temp_c=temp_start + 1500 * temp_drift_rate - sec * 0.001,
        ))

    session.points = points
    session.duration_s = points[-1].timestamp_s
    session.has_power = True
    session.has_hr = True
    session.has_core_temp = True
    session.has_stroke_data = True
    return session


def generate_interval_session(fatigued=False) -> SessionData:
    """Simulate 3 × 10 × 30s ON / 15s OFF with 4-min rest between sets."""
    session = SessionData(filename="intervals_30_15_sim.fit", sport="skierg", device="concept2_pm5")
    points = []

    target_power = 280 if not fatigued else 260
    power_decay_per_rep = 1.5 if not fatigued else 2.8  # per rep within set
    power_decay_per_set = 8 if not fatigued else 15  # between sets

    hr_base = 150
    hr_accumulation = 0.8  # bpm per rep
    temp_base = 37.2
    t_cursor = 0.0

    rep_counter = 0
    for set_idx in range(3):
        set_power_offset = set_idx * power_decay_per_set

        for rep_idx in range(10):
            rep_counter += 1
            rep_power = target_power - set_power_offset - rep_idx * power_decay_per_rep
            rep_hr = hr_base + rep_counter * hr_accumulation

            # 30s ON
            for sec in range(30):
                points.append(DataPoint(
                    timestamp_s=t_cursor,
                    power_w=rep_power + np.random.normal(0, 8),
                    heart_rate_bpm=min(rep_hr + sec * 0.3, 190) + np.random.normal(0, 0.5),
                    core_temp_c=temp_base + rep_counter * 0.05 + np.random.normal(0, 0.02),
                    cadence_spm=30 + np.random.normal(0, 0.5),
                    drive_time_ms=650 + rep_counter * 2 + np.random.normal(0, 8),
                ))
                t_cursor += 1.0

            # 15s OFF
            for sec in range(15):
                points.append(DataPoint(
                    timestamp_s=t_cursor,
                    power_w=5 + np.random.normal(0, 3),
                    heart_rate_bpm=rep_hr + 8 - sec * 0.6 + np.random.normal(0, 0.5),
                    core_temp_c=temp_base + rep_counter * 0.05 + np.random.normal(0, 0.02),
                ))
                t_cursor += 1.0

        # 4-min rest between sets (except after last)
        if set_idx < 2:
            rest_hr = rep_hr + 5  # elevated from set
            for sec in range(240):
                points.append(DataPoint(
                    timestamp_s=t_cursor,
                    power_w=0,
                    heart_rate_bpm=rest_hr - sec * 0.15 + np.random.normal(0, 0.5),
                    core_temp_c=temp_base + rep_counter * 0.05 - sec * 0.002 + np.random.normal(0, 0.02),
                ))
                t_cursor += 1.0

    session.points = points
    session.duration_s = t_cursor
    session.has_power = True
    session.has_hr = True
    session.has_core_temp = True
    session.has_stroke_data = True
    return session


def run_demo():
    print("=" * 65)
    print("  FATIGUE MODEL — Marker Extraction Pipeline Demo")
    print("=" * 65)

    scenarios = [
        ("RAMP TEST (fresh)", generate_ramp_session(fatigued=False), "ramp"),
        ("RAMP TEST (fatigued)", generate_ramp_session(fatigued=True), "ramp"),
        ("STEADY STATE (fresh)", generate_steady_state_session(fatigued=False), "steady_state"),
        ("STEADY STATE (fatigued)", generate_steady_state_session(fatigued=True), "steady_state"),
        ("30/15 INTERVALS (fresh)", generate_interval_session(fatigued=False), "intervals_30_15"),
        ("30/15 INTERVALS (fatigued)", generate_interval_session(fatigued=True), "intervals_30_15"),
    ]

    all_results = []

    for name, session, expected_type in scenarios:
        print(f"\n{'─' * 65}")
        print(f"  {name}")
        print(f"  Duration: {session.duration_s/60:.1f} min | Points: {len(session.points)}")
        print(f"  Channels: power={session.has_power} hr={session.has_hr} "
              f"temp={session.has_core_temp} stroke={session.has_stroke_data}")

        # Auto-detect
        detected = detect_session_type(session)
        match = "✓" if detected == expected_type else "✗"
        print(f"  Detection: {detected} {match}")

        # Extract markers
        if detected == "ramp":
            markers = extract_ramp_markers(session, ref_power_w=180.0)
        elif detected == "steady_state":
            markers = extract_steady_state_markers(session)
        elif detected == "intervals_30_15":
            markers = extract_interval_markers(session)
        else:
            markers = {"error": "unknown type"}

        # Print key markers
        print(f"\n  Key markers:")
        skip_keys = {"session_type", "protocol", "stages", "reps", "sets",
                      "power_per_rep", "hr_per_rep", "hr_drop_per_rest"}

        for k, v in markers.items():
            if k in skip_keys:
                continue
            if isinstance(v, float):
                print(f"    {k}: {v:.2f}")
            elif isinstance(v, list) and len(v) > 6:
                print(f"    {k}: [{v[0]:.1f}, {v[1]:.1f}, ... {v[-1]:.1f}] ({len(v)} values)")
            else:
                print(f"    {k}: {v}")

        # Print set summaries for intervals
        if "sets" in markers:
            print(f"\n  Set summaries:")
            for s in markers["sets"]:
                print(f"    Set {s['set']}: {s.get('avg_power_w','?')}W avg, "
                      f"{s.get('power_fade_pct','?')}% fade, "
                      f"{s.get('avg_hr_bpm','?')} bpm, "
                      f"temp={s.get('core_temp_end_c','?')}°C")

        all_results.append({"scenario": name, "markers": markers})

    # Compare fresh vs fatigued
    print(f"\n{'=' * 65}")
    print("  FRESH vs FATIGUED COMPARISON")
    print(f"{'=' * 65}")

    comparisons = [
        ("Ramp: HR@180W", 
         all_results[0]["markers"].get("hr_at_ref_power_bpm"),
         all_results[1]["markers"].get("hr_at_ref_power_bpm"), "bpm", "↑ = fatigued"),
        ("Ramp: Temp@180W",
         all_results[0]["markers"].get("core_temp_at_ref_power_c"),
         all_results[1]["markers"].get("core_temp_at_ref_power_c"), "°C", "↑ = fatigued"),
        ("Ramp: Max stage",
         all_results[0]["markers"].get("max_completed_stage"),
         all_results[1]["markers"].get("max_completed_stage"), "stages", "↓ = fatigued"),
        ("Steady: HR drift",
         all_results[2]["markers"].get("hr_drift_abs_bpm"),
         all_results[3]["markers"].get("hr_drift_abs_bpm"), "bpm", "↑ = fatigued"),
        ("Steady: Temp drift",
         all_results[2]["markers"].get("core_temp_drift_c"),
         all_results[3]["markers"].get("core_temp_drift_c"), "°C", "↑ = fatigued"),
        ("Steady: Power CV",
         all_results[2]["markers"].get("power_cv_pct"),
         all_results[3]["markers"].get("power_cv_pct"), "%", "↑ = fatigued"),
        ("30/15: Decrement",
         all_results[4]["markers"].get("power_decrement_pct"),
         all_results[5]["markers"].get("power_decrement_pct"), "%", "↑ = fatigued"),
        ("30/15: Set 1 power",
         all_results[4]["markers"].get("set1_mean_power_w"),
         all_results[5]["markers"].get("set1_mean_power_w"), "W", "↓ = fatigued"),
    ]

    print(f"\n  {'Marker':<25} {'Fresh':>10} {'Fatigued':>10} {'Delta':>10}  Signal")
    print(f"  {'─'*25} {'─'*10} {'─'*10} {'─'*10}  {'─'*12}")
    for label, fresh, fatigue, unit, signal in comparisons:
        if fresh is not None and fatigue is not None:
            delta = fatigue - fresh
            print(f"  {label:<25} {fresh:>9.1f} {fatigue:>9.1f} {delta:>+9.1f}  {signal}")
        else:
            print(f"  {label:<25} {'N/A':>10} {'N/A':>10}")

    # Save full output
    with open("demo_output.json", "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    print(f"\n\nFull output saved to demo_output.json")


if __name__ == "__main__":
    run_demo()
