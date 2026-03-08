from __future__ import annotations

import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from supabase import Client, create_client


class SupabaseRepository:
    def __init__(self, url: str | None = None, service_key: str | None = None, bucket: str | None = None):
        resolved_url = url or os.environ.get("SUPABASE_URL")
        resolved_key = service_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not resolved_url or not resolved_key:
            raise ValueError("Supabase credentials are required")
        self.client: Client = create_client(resolved_url, resolved_key)
        self.bucket = bucket or os.environ.get("SUPABASE_BUCKET", "sport-science-raw")

    def fetch_pending_import_jobs(self, limit: int = 10):
        response = (
            self.client.table("sport_science_import_job")
            .select("*")
            .in_("status", ["uploaded", "parsed"])
            .limit(limit)
            .execute()
        )
        return response.data or []

    def update_import_job(self, job_id: str, payload: dict[str, Any]):
        return (
            self.client.table("sport_science_import_job")
            .update(payload)
            .eq("id", job_id)
            .execute()
        )

    def upsert_training_session(self, payload: dict[str, Any]):
        return self.client.table("sport_science_training_session").upsert(payload).execute()

    def replace_session_intervals(self, session_id: str, payload: list[dict[str, Any]]):
        self.client.table("sport_science_session_interval").delete().eq("session_id", session_id).execute()
        if payload:
            self.client.table("sport_science_session_interval").insert(payload).execute()

    def replace_session_markers(self, session_id: str, payload: list[dict[str, Any]]):
        self.client.table("sport_science_session_marker").delete().eq("session_id", session_id).execute()
        if payload:
            self.client.table("sport_science_session_marker").insert(payload).execute()

    def upsert_derived_feature(self, payload: dict[str, Any]):
        return self.client.table("sport_science_derived_feature").upsert(payload).execute()

    def create_model_run(self, payload: dict[str, Any]):
        return self.client.table("sport_science_model_run").insert(payload).execute()

    def upsert_readiness_snapshot(self, payload: dict[str, Any]):
        return self.client.table("sport_science_readiness_snapshot").upsert(payload).execute()

    def get_athlete_daily_rows(self, athlete_id: str):
        daily = (
            self.client.table("sport_science_daily_state")
            .select("*")
            .eq("athlete_id", athlete_id)
            .order("date")
            .execute()
            .data
            or []
        )
        mental = (
            self.client.table("sport_science_mental_load")
            .select("*")
            .eq("athlete_id", athlete_id)
            .order("date")
            .execute()
            .data
            or []
        )
        sessions = (
            self.client.table("sport_science_training_session")
            .select("*")
            .eq("athlete_id", athlete_id)
            .order("session_date")
            .execute()
            .data
            or []
        )
        session_ids = [row["id"] for row in sessions]
        markers = []
        if session_ids:
            markers = (
                self.client.table("sport_science_session_marker")
                .select("*")
                .in_("session_id", session_ids)
                .execute()
                .data
                or []
            )
        return daily, mental, sessions, markers

    def download_storage_file(self, storage_path: str, destination_dir: str) -> str:
        content = self.client.storage.from_(self.bucket).download(storage_path)
        target = Path(destination_dir) / Path(storage_path).name
        target.write_bytes(content)
        return str(target)

    def with_temp_download(self, storage_path: str):
        temp_dir = TemporaryDirectory()
        filepath = self.download_storage_file(storage_path, temp_dir.name)
        return temp_dir, filepath

    def log_payload(self, payload: dict[str, Any]) -> str:
        return json.dumps(payload, default=str)
