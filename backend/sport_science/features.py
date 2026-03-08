from __future__ import annotations

from statistics import mean, pstdev
from typing import Iterable

from .contracts import DerivedFeatureRow, MarkerRow, NormalizedSession


def _protocol_intensity(protocol: str) -> tuple[float, float]:
    if protocol == "intervals_30_15":
        return 0.42, 0.95
    if protocol == "ramp":
        return 0.72, 0.55
    if protocol == "steady_state":
        return 0.82, 0.28
    return 0.65, 0.35


def _marker_value(markers: Iterable[MarkerRow], key: str):
    for marker in markers:
        if marker.marker_key == key and marker.numeric_value is not None:
            return float(marker.numeric_value)
    return None


def _rolling_mean(values: list[float]) -> float:
    return mean(values) if values else 0.0


def _monotony(values: list[float]) -> float:
    if not values:
        return 0.0
    deviation = pstdev(values) if len(values) > 1 else 0.0
    if deviation == 0:
        return 0.0
    return mean(values) / deviation


def build_daily_feature_row(
    athlete_id: str,
    feature_date: str,
    daily_state: dict,
    mental_load: dict | None,
    sessions: list[NormalizedSession],
    history: list[DerivedFeatureRow] | None = None,
) -> DerivedFeatureRow:
    history = history or []

    load_aerobic = 0.0
    load_neuromuscular = 0.0
    load_total = 0.0
    markers: list[MarkerRow] = []

    for session in sessions:
        aero_share, neuro_share = _protocol_intensity(session.session_protocol)
        duration_hours = max(session.duration_s, 0.0) / 3600.0
        session_load = duration_hours * 100.0
        load_aerobic += session_load * aero_share
        load_neuromuscular += session_load * neuro_share
        load_total += session_load
        markers.extend(session.markers)

    mental_values = [
        value
        for value in [
            (mental_load or {}).get("perceived_stress_1_5"),
            (mental_load or {}).get("cognitive_demand_1_5"),
        ]
        if value is not None
    ]
    mental_score = float(mean(mental_values)) if mental_values else 0.0

    recent_total_loads = [item.load_total for item in history[-6:]] + [load_total]
    recent_mental = [item.mental_load for item in history[-6:]] + [mental_score]
    atl_window = [item.load_total for item in history[-6:]] + [load_total]
    ctl_window = [item.load_total for item in history[-41:]] + [load_total]

    return DerivedFeatureRow(
        athlete_id=athlete_id,
        feature_date=feature_date,
        load_aerobic=round(load_aerobic, 2),
        load_neuromuscular=round(load_neuromuscular, 2),
        load_total=round(load_total, 2),
        mental_load=round(mental_score, 2),
        sleep_quality=float(daily_state.get("sleep_quality_1_5") or 1.0),
        resting_hr_bpm=daily_state.get("resting_hr_bpm"),
        hrv_rmssd_ms=daily_state.get("hrv_rmssd_ms"),
        hr_at_ref_power=_marker_value(markers, "hr_at_ref_power_bpm"),
        hr_drift=_marker_value(markers, "hr_drift_abs_bpm"),
        core_temp_drift=_marker_value(markers, "core_temp_drift_c"),
        power_decrement=_marker_value(markers, "power_decrement_pct"),
        set1_power=_marker_value(markers, "set1_mean_power_w"),
        stroke_drift=_marker_value(markers, "sr_drift_spm"),
        rpe_residual=None,
        pvt_rt=(mental_load or {}).get("pvt_mean_rt_ms"),
        atl_7d=round(_rolling_mean(atl_window), 2),
        ctl_42d=round(_rolling_mean(ctl_window), 2),
        mental_load_7d_avg=round(_rolling_mean(recent_mental), 2),
        monotony_7d=round(_monotony(recent_total_loads), 2),
    )
