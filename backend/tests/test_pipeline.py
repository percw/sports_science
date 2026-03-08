import unittest

from backend.sport_science.contracts import DerivedFeatureRow
from backend.sport_science.features import build_daily_feature_row

try:
    from backend.sport_science.modeling import fit_and_score
    MODEL_IMPORT_ERROR = None
except ModuleNotFoundError as exc:  # pragma: no cover - depends on local env
    fit_and_score = None
    MODEL_IMPORT_ERROR = exc

try:
    from science.files.fatigue_model import FatigueModelParams, resolve_fit_subset
    REGISTRY_IMPORT_ERROR = None
except ModuleNotFoundError as exc:  # pragma: no cover - depends on local env
    FatigueModelParams = None
    resolve_fit_subset = None
    REGISTRY_IMPORT_ERROR = exc

try:
    from science.fatigue_demo import (
        generate_interval_session,
        generate_ramp_session,
        generate_steady_state_session,
    )
    DEMO_IMPORT_ERROR = None
except ModuleNotFoundError as exc:  # pragma: no cover - depends on local env
    generate_interval_session = None
    generate_ramp_session = None
    generate_steady_state_session = None
    DEMO_IMPORT_ERROR = exc


class PipelineTests(unittest.TestCase):
    @unittest.skipIf(REGISTRY_IMPORT_ERROR is not None, f"Scientific dependencies missing: {REGISTRY_IMPORT_ERROR}")
    def test_parameter_registry_groups_and_profiles(self):
        grouped = FatigueModelParams.grouped_params(["tau_a_off", "alpha_a", "kappa_mc"])
        self.assertIn("recovery_time_constants", grouped)
        self.assertIn("state_dependence", grouped)
        self.assertIn("cross_talk", grouped)

        resolved = resolve_fit_subset(
            fit_profiles=["dynamics_core"],
            fit_subset=["kappa_mc"],
        )
        self.assertIn("tau_a_off", resolved)
        self.assertIn("alpha_a", resolved)
        self.assertIn("kappa_mc", resolved)

    @unittest.skipIf(DEMO_IMPORT_ERROR is not None, f"Scientific dependencies missing: {DEMO_IMPORT_ERROR}")
    def test_demo_sessions_generate_expected_protocols(self):
        self.assertGreater(len(generate_ramp_session().points), 100)
        self.assertGreater(len(generate_steady_state_session().points), 100)
        self.assertGreater(len(generate_interval_session().points), 100)

    @unittest.skipIf(MODEL_IMPORT_ERROR is not None, f"Scientific dependencies missing: {MODEL_IMPORT_ERROR}")
    def test_feature_and_model_pipeline(self):
        rows = [
            DerivedFeatureRow(
                athlete_id="athlete_1",
                feature_date=f"2026-03-{day:02d}",
                load_aerobic=40 + day,
                load_neuromuscular=20 + day / 2,
                load_total=60 + day,
                mental_load=2.0 + day * 0.03,
                sleep_quality=4.0,
                resting_hr_bpm=48 + day * 0.05,
                hrv_rmssd_ms=72 - day * 0.1,
                hr_at_ref_power=155 + day * 0.1,
                hr_drift=5 + day * 0.05,
                core_temp_drift=0.2 + day * 0.005,
                power_decrement=3.5 + day * 0.05,
                set1_power=270 - day * 0.15,
                stroke_drift=0.4 + day * 0.01,
                pvt_rt=285 + day * 0.4,
            )
            for day in range(1, 28)
        ]

        fit_info, readiness = fit_and_score(rows)

        self.assertEqual(fit_info["model_version"], "fatigue-files-v1")
        self.assertEqual(len(readiness), len(rows))
        self.assertGreaterEqual(readiness[-1].readiness_score, 0.0)
        self.assertLessEqual(readiness[-1].readiness_score, 100.0)

    def test_daily_feature_builder_uses_recent_history(self):
        first = build_daily_feature_row(
            athlete_id="athlete_1",
            feature_date="2026-03-01",
            daily_state={"sleep_quality_1_5": 4, "hrv_rmssd_ms": 72},
            mental_load={"perceived_stress_1_5": 2, "cognitive_demand_1_5": 3},
            sessions=[],
            history=[],
        )
        second = build_daily_feature_row(
            athlete_id="athlete_1",
            feature_date="2026-03-02",
            daily_state={"sleep_quality_1_5": 4, "hrv_rmssd_ms": 71},
            mental_load={"perceived_stress_1_5": 3, "cognitive_demand_1_5": 4},
            sessions=[],
            history=[first],
        )

        self.assertGreaterEqual(second.mental_load_7d_avg, first.mental_load_7d_avg)


if __name__ == "__main__":
    unittest.main()
