from __future__ import annotations

from dataclasses import asdict
from typing import Iterable

import numpy as np

from science.files.fatigue_model import DailyInput, FatigueModelParams, fit_model, simulate

from .contracts import DerivedFeatureRow, ReadinessResult

MODEL_VERSION = "fatigue-files-v1"
PRODUCTION_FIT_PROFILES = ["dynamics_core", "coupling_core", "observation_core"]


def derived_rows_to_inputs(rows: Iterable[DerivedFeatureRow]) -> list[DailyInput]:
    inputs: list[DailyInput] = []
    for index, row in enumerate(rows):
        inputs.append(
            DailyInput(
                day=index,
                date=row.feature_date,
                load_aerobic=row.load_aerobic,
                load_neuromuscular=row.load_neuromuscular,
                load_total=row.load_total,
                mental_load=row.mental_load,
                sleep_quality=max(row.sleep_quality / 5.0, 0.3),
                hr_at_ref_power=row.hr_at_ref_power,
                hr_drift=row.hr_drift,
                core_temp_drift=row.core_temp_drift,
                power_decrement=row.power_decrement,
                set1_power=row.set1_power,
                stroke_drift=row.stroke_drift,
                rpe_residual=row.rpe_residual,
                pvt_rt=row.pvt_rt,
                hrv_rmssd=row.hrv_rmssd_ms,
            )
        )
    return inputs


def _readiness_score(state: np.ndarray) -> float:
    aerobic, neuromuscular, central, fitness = state
    raw = 72.0 + 16.0 * fitness - 12.5 * aerobic - 11.0 * neuromuscular - 10.0 * central
    return float(max(0.0, min(100.0, raw)))


def _confidence(latest_row: DerivedFeatureRow, n_days: int) -> float:
    observed = sum(
        1
        for value in [
            latest_row.hrv_rmssd_ms,
            latest_row.hr_at_ref_power,
            latest_row.hr_drift,
            latest_row.core_temp_drift,
            latest_row.power_decrement,
            latest_row.set1_power,
            latest_row.pvt_rt,
        ]
        if value is not None
    )
    return float(min(0.92, 0.25 + observed * 0.08 + min(n_days, 60) * 0.006))


def _contributors(state: np.ndarray, row: DerivedFeatureRow) -> list[dict]:
    aerobic, neuromuscular, central, fitness = state
    items = [
        {"label": "Aerobic fatigue state", "value": round(float(aerobic), 3), "direction": "alert"},
        {"label": "Neuromuscular fatigue state", "value": round(float(neuromuscular), 3), "direction": "alert"},
        {"label": "Central fatigue state", "value": round(float(central), 3), "direction": "alert"},
        {"label": "Fitness state", "value": round(float(fitness), 3), "direction": "positive"},
        {"label": "7-day acute load", "value": row.atl_7d, "direction": "neutral"},
        {"label": "7-day mental load", "value": row.mental_load_7d_avg, "direction": "neutral"},
    ]
    return items


def fit_and_score(rows: list[DerivedFeatureRow]) -> tuple[dict, list[ReadinessResult]]:
    inputs = derived_rows_to_inputs(rows)
    params = FatigueModelParams()

    fit_info = {
        "model_version": MODEL_VERSION,
        "fit_strategy": "default-parameters",
        "n_days": len(rows),
    }

    if len(inputs) >= 21:
        params, info = fit_model(
            inputs,
            params,
            max_iter=250,
            fit_profiles=PRODUCTION_FIT_PROFILES,
            fit_subset=[
                "beta_a_hr_drift",
                "beta_n_power_dec",
                "beta_n_set1_power",
                "beta_c_pvt",
            ],
        )
        fit_info = {
            "model_version": MODEL_VERSION,
            "fit_strategy": "map-lbfgsb",
            **info,
            "fit_profiles": PRODUCTION_FIT_PROFILES,
        }

    result = simulate(inputs, params)
    readiness_results: list[ReadinessResult] = []

    for row, state in zip(rows, result["states"]):
        contributors = _contributors(state, row)
        readiness_results.append(
            ReadinessResult(
                athlete_id=row.athlete_id,
                snapshot_date=row.feature_date,
                model_version=MODEL_VERSION,
                readiness_score=round(_readiness_score(state), 1),
                confidence=round(_confidence(row, len(rows)), 2),
                aerobic_fatigue=round(float(state[0]), 4),
                neuromuscular_fatigue=round(float(state[1]), 4),
                central_fatigue=round(float(state[2]), 4),
                fitness=round(float(state[3]), 4),
                contributor_summary=(
                    "Readiness is computed from the latest latent state estimate. "
                    "The score remains interpretable because each fatigue dimension is stored separately."
                ),
                contributor_json=contributors,
                model_metadata={
                    "params": asdict(params),
                    "predictions": result["predictions"][-1] if result["predictions"] else {},
                },
            )
        )

    return fit_info, readiness_results
