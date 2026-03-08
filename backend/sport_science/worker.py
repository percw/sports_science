from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime

from .contracts import MarkerRow, NormalizedSession
from .extractor import normalize_extraction_result, session_to_records
from .features import build_daily_feature_row
from .modeling import fit_and_score
from .repository import SupabaseRepository


def _group_by_date(rows: list[dict], key: str) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row[key]].append(row)
    return grouped


def refresh_athlete_model(repo: SupabaseRepository, athlete_id: str):
    daily_rows, mental_rows, session_rows, marker_rows = repo.get_athlete_daily_rows(athlete_id)
    daily_by_date = {row["date"]: row for row in daily_rows}
    mental_by_date = {row["date"]: row for row in mental_rows}
    markers_by_session = _group_by_date(marker_rows, "session_id")
    sessions_by_date: dict[str, list[NormalizedSession]] = defaultdict(list)

    for session in session_rows:
        marker_objects = [
            MarkerRow(
                session_id=row["session_id"],
                marker_key=row["marker_key"],
                marker_scope=row.get("marker_scope") or "session",
                numeric_value=row.get("numeric_value"),
                text_value=row.get("text_value"),
                json_value=row.get("json_value"),
                unit=row.get("unit"),
                stage_index=row.get("stage_index"),
                set_index=row.get("set_index"),
                rep_index=row.get("rep_index"),
            )
            for row in markers_by_session.get(session["id"], [])
        ]
        sessions_by_date[session["session_date"]].append(
            NormalizedSession(
                session_id=session["id"],
                athlete_id=session["athlete_id"],
                session_date=session["session_date"],
                session_protocol=session.get("session_protocol", "unknown"),
                sport=session.get("sport", "unknown"),
                source_file_name=session.get("source_file_name", "remote"),
                duration_s=float(session.get("duration_s") or 0.0),
                device=session.get("device", "unknown"),
                detected_type=session.get("detected_type", "unknown"),
                body_region=session.get("body_region"),
                contraction_type=session.get("contraction_type"),
                summary=session.get("raw_summary_json") or {},
                markers=marker_objects,
            )
        )

    history = []
    feature_rows = []

    for feature_date in sorted(set(daily_by_date) | set(mental_by_date) | set(sessions_by_date)):
        feature = build_daily_feature_row(
            athlete_id=athlete_id,
            feature_date=feature_date,
            daily_state=daily_by_date.get(feature_date, {}),
            mental_load=mental_by_date.get(feature_date, {}),
            sessions=sessions_by_date.get(feature_date, []),
            history=history,
        )
        feature_rows.append(feature)
        history.append(feature)
        repo.upsert_derived_feature(feature.to_record())

    fit_info, readiness_rows = fit_and_score(feature_rows)
    repo.create_model_run(
        {
            "athlete_id": athlete_id,
            "model_version": fit_info["model_version"],
            "run_started_at": datetime.utcnow().isoformat(),
            "fit_metadata": fit_info,
        }
    )
    for readiness in readiness_rows:
        repo.upsert_readiness_snapshot(readiness.to_snapshot_record())


def process_pending_imports(repo: SupabaseRepository, limit: int = 10):
    jobs = repo.fetch_pending_import_jobs(limit=limit)
    for job in jobs:
        if not job.get("storage_path"):
            repo.update_import_job(job["id"], {"status": "failed", "error_message": "Missing storage_path"})
            continue

        temp_dir, filepath = repo.with_temp_download(job["storage_path"])
        try:
            repo.update_import_job(job["id"], {"status": "parsed"})
            session = normalize_extraction_result(
                athlete_id=job["athlete_id"],
                session_id=job.get("session_id") or job["id"],
                filepath=filepath,
                session_date=job.get("session_date") or datetime.utcnow().date().isoformat(),
            )
            records = session_to_records(session)
            repo.upsert_training_session(records["training_session"])
            repo.replace_session_intervals(session.session_id, records["session_intervals"])
            repo.replace_session_markers(session.session_id, records["session_markers"])
            repo.update_import_job(job["id"], {"status": "ready_for_model"})
            refresh_athlete_model(repo, job["athlete_id"])
            repo.update_import_job(job["id"], {"status": "scored", "error_message": None})
        except Exception as exc:  # pragma: no cover - operational path
            repo.update_import_job(job["id"], {"status": "failed", "error_message": str(exc)})
        finally:
            temp_dir.cleanup()


def main():
    parser = argparse.ArgumentParser(description="Process pending sport science import jobs.")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    repo = SupabaseRepository()
    process_pending_imports(repo, limit=args.limit)


if __name__ == "__main__":
    main()
