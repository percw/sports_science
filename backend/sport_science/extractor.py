from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from science.fatigue_extract import process_file

from .contracts import IntervalRow, MarkerRow, NormalizedSession

UNIT_MAP = {
    "avg_power_w": "W",
    "avg_hr_bpm": "bpm",
    "peak_hr_bpm": "bpm",
    "avg_core_temp_c": "C",
    "avg_cadence_spm": "spm",
    "avg_drive_time_ms": "ms",
    "hr_at_ref_power_bpm": "bpm",
    "core_temp_at_ref_power_c": "C",
    "sr_at_ref_power_spm": "spm",
    "cardiac_decoupling_slope": "bpm/W",
    "thermal_rise_rate_c_per_min": "C/min",
    "max_hr_bpm": "bpm",
    "core_temp_max_c": "C",
    "hr_drift_abs_bpm": "bpm",
    "hr_drift_rate_bpm_per_min": "bpm/min",
    "core_temp_drift_c": "C",
    "core_temp_drift_rate_c_per_min": "C/min",
    "time_to_thermal_plateau_min": "min",
    "power_cv_pct": "%",
    "sr_drift_spm": "spm",
    "drive_time_drift_ms": "ms",
    "stroke_power_sd_w": "W",
    "power_decrement_pct": "%",
    "set1_mean_power_w": "W",
    "hr_post_10min_bpm": "bpm",
}


def _body_region_for_sport(sport: str) -> str:
    sport = (sport or "").lower()
    if sport in {"skierg", "kayak", "rowing"}:
        return "upper"
    if sport in {"cycling", "run", "xc_ski"}:
        return "lower"
    return "full"


def _contraction_type_for_sport(sport: str) -> str:
    sport = (sport or "").lower()
    if sport in {"skierg", "cycling"}:
        return "concentric"
    if sport in {"run", "xc_ski"}:
        return "mixed"
    return "mixed"


def _flatten_markers(
    session_id: str,
    markers: dict[str, Any],
) -> tuple[list[IntervalRow], list[MarkerRow]]:
    intervals: list[IntervalRow] = []
    marker_rows: list[MarkerRow] = []

    for key, value in markers.items():
        if key in {"stages", "reps", "sets"} and isinstance(value, list):
            if key == "stages":
                for item in value:
                    intervals.append(
                        IntervalRow(
                            session_id=session_id,
                            interval_type="ramp_stage",
                            stage_index=item.get("stage"),
                            avg_power_w=item.get("avg_power_w"),
                            avg_hr_bpm=item.get("avg_hr_bpm"),
                            avg_core_temp_c=item.get("avg_core_temp_c"),
                            avg_cadence_spm=item.get("avg_cadence_spm"),
                            avg_drive_time_ms=item.get("avg_drive_time_ms"),
                        )
                    )
            elif key == "reps":
                for item in value:
                    marker_rows.append(
                        MarkerRow(
                            session_id=session_id,
                            marker_key="hr_drop_during_rest_bpm",
                            marker_scope="rep",
                            numeric_value=item.get("hr_drop_during_rest_bpm"),
                            unit="bpm",
                            rep_index=item.get("rep"),
                        )
                    )
                    intervals.append(
                        IntervalRow(
                            session_id=session_id,
                            interval_type="work_rep",
                            rep_index=item.get("rep"),
                            start_offset_s=item.get("t_start"),
                            end_offset_s=item.get("t_end"),
                            avg_power_w=item.get("avg_power_w"),
                            avg_hr_bpm=item.get("avg_hr_bpm"),
                            peak_hr_bpm=item.get("peak_hr_bpm"),
                            avg_core_temp_c=item.get("avg_core_temp_c"),
                            avg_cadence_spm=item.get("avg_cadence_spm"),
                            avg_drive_time_ms=item.get("avg_drive_time_ms"),
                        )
                    )
            elif key == "sets":
                for item in value:
                    intervals.append(
                        IntervalRow(
                            session_id=session_id,
                            interval_type="interval_set",
                            set_index=item.get("set"),
                            avg_power_w=item.get("avg_power_w"),
                            avg_hr_bpm=item.get("avg_hr_bpm"),
                            avg_core_temp_c=item.get("core_temp_end_c"),
                        )
                    )
                    marker_rows.append(
                        MarkerRow(
                            session_id=session_id,
                            marker_key="power_fade_pct",
                            marker_scope="set",
                            numeric_value=item.get("power_fade_pct"),
                            unit="%",
                            set_index=item.get("set"),
                        )
                    )
            continue

        if isinstance(value, list):
            for index, item in enumerate(value, start=1):
                marker_rows.append(
                    MarkerRow(
                        session_id=session_id,
                        marker_key=key,
                        marker_scope="array_value",
                        numeric_value=float(item) if isinstance(item, (int, float)) else None,
                        text_value=None if isinstance(item, (int, float)) else str(item),
                        unit=UNIT_MAP.get(key),
                        rep_index=index,
                    )
                )
            continue

        if isinstance(value, (int, float)):
            marker_rows.append(
                MarkerRow(
                    session_id=session_id,
                    marker_key=key,
                    numeric_value=float(value),
                    unit=UNIT_MAP.get(key),
                )
            )
            continue

        if isinstance(value, dict):
            marker_rows.append(
                MarkerRow(
                    session_id=session_id,
                    marker_key=key,
                    json_value=value,
                )
            )
            continue

        marker_rows.append(
            MarkerRow(
                session_id=session_id,
                marker_key=key,
                text_value=None if value is None else str(value),
            )
        )

    return intervals, marker_rows


def normalize_extraction_result(
    athlete_id: str,
    session_id: str,
    filepath: str,
    session_date: str,
    ref_power_w: float = 180.0,
    force_type: str | None = None,
) -> NormalizedSession:
    result = process_file(filepath, ref_power_w=ref_power_w, force_type=force_type)
    markers = result.get("markers", {})
    intervals, marker_rows = _flatten_markers(session_id, markers)

    return NormalizedSession(
        session_id=session_id,
        athlete_id=athlete_id,
        session_date=session_date,
        session_protocol=result.get("detected_type", "unknown"),
        sport=result.get("sport", "unknown"),
        source_file_name=result.get("file", Path(filepath).name),
        duration_s=float(result.get("duration_s", 0.0)),
        device=result.get("device", "unknown"),
        detected_type=result.get("detected_type", "unknown"),
        body_region=_body_region_for_sport(result.get("sport", "unknown")),
        contraction_type=_contraction_type_for_sport(result.get("sport", "unknown")),
        summary={
            "data_channels": result.get("data_channels", {}),
            "markers": markers,
        },
        intervals=intervals,
        markers=marker_rows,
    )


def session_to_records(session: NormalizedSession) -> dict[str, Any]:
    return {
        "training_session": {
            "id": session.session_id,
            "athlete_id": session.athlete_id,
            "session_date": session.session_date,
            "duration_s": session.duration_s,
            "sport": session.sport,
            "session_protocol": session.session_protocol,
            "body_region": session.body_region,
            "contraction_type": session.contraction_type,
            "source_file_name": session.source_file_name,
            "device": session.device,
            "detected_type": session.detected_type,
            "raw_summary_json": session.summary,
        },
        "session_intervals": [
            {
                **item.__dict__,
                "athlete_id": session.athlete_id,
            }
            for item in session.intervals
        ],
        "session_markers": [
            {
                **item.__dict__,
                "athlete_id": session.athlete_id,
                "json_value": json.dumps(item.json_value) if item.json_value is not None else None,
            }
            for item in session.markers
        ],
    }
