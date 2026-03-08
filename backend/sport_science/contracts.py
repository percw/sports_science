from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Optional


@dataclass
class IntervalRow:
    session_id: str
    interval_type: str
    stage_index: Optional[int] = None
    set_index: Optional[int] = None
    rep_index: Optional[int] = None
    start_offset_s: Optional[float] = None
    end_offset_s: Optional[float] = None
    avg_power_w: Optional[float] = None
    avg_hr_bpm: Optional[float] = None
    peak_hr_bpm: Optional[float] = None
    avg_core_temp_c: Optional[float] = None
    avg_cadence_spm: Optional[float] = None
    avg_drive_time_ms: Optional[float] = None


@dataclass
class MarkerRow:
    session_id: str
    marker_key: str
    marker_scope: str = "session"
    numeric_value: Optional[float] = None
    text_value: Optional[str] = None
    json_value: Optional[Any] = None
    unit: Optional[str] = None
    stage_index: Optional[int] = None
    set_index: Optional[int] = None
    rep_index: Optional[int] = None


@dataclass
class NormalizedSession:
    session_id: str
    athlete_id: str
    session_date: str
    session_protocol: str
    sport: str
    source_file_name: str
    duration_s: float
    device: str = "unknown"
    detected_type: str = "unknown"
    body_region: Optional[str] = None
    contraction_type: Optional[str] = None
    summary: dict[str, Any] = field(default_factory=dict)
    intervals: list[IntervalRow] = field(default_factory=list)
    markers: list[MarkerRow] = field(default_factory=list)


@dataclass
class DerivedFeatureRow:
    athlete_id: str
    feature_date: str
    load_aerobic: float
    load_neuromuscular: float
    load_total: float
    mental_load: float
    sleep_quality: float
    resting_hr_bpm: Optional[float] = None
    hrv_rmssd_ms: Optional[float] = None
    hr_at_ref_power: Optional[float] = None
    hr_drift: Optional[float] = None
    core_temp_drift: Optional[float] = None
    power_decrement: Optional[float] = None
    set1_power: Optional[float] = None
    stroke_drift: Optional[float] = None
    rpe_residual: Optional[float] = None
    pvt_rt: Optional[float] = None
    atl_7d: float = 0.0
    ctl_42d: float = 0.0
    mental_load_7d_avg: float = 0.0
    monotony_7d: float = 0.0

    def to_record(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ReadinessResult:
    athlete_id: str
    snapshot_date: str
    model_version: str
    readiness_score: float
    confidence: float
    aerobic_fatigue: float
    neuromuscular_fatigue: float
    central_fatigue: float
    fitness: float
    contributor_summary: str
    contributor_json: list[dict[str, Any]]
    model_metadata: dict[str, Any] = field(default_factory=dict)

    def to_snapshot_record(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["contributor_json"] = self.contributor_json
        payload.pop("model_metadata", None)
        return payload
