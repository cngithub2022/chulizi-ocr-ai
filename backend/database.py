"""SQLite-based OCR history persistence."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from ocr_engine import APP_DATA_DIR as OCR_APP_HOME

DB_PATH = Path(str(OCR_APP_HOME)) / "history.db"


class OCRRecord(BaseModel):
    """A single OCR history entry."""

    id: int | None = None
    filename: str
    page_count: int = 1
    result_json: str  # serialised list[dict]
    text_preview: str  # first ~200 chars of extracted text
    created_at: str = ""


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ocr_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                filename    TEXT    NOT NULL,
                page_count  INTEGER NOT NULL DEFAULT 1,
                result_json TEXT    NOT NULL,
                text_preview TEXT   NOT NULL DEFAULT '',
                created_at  TEXT    NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_history_created "
            "ON ocr_history(created_at DESC)"
        )


def add_record(filename: str, page_count: int, result: list[list[dict[str, Any]]]) -> int:
    """Insert a new OCR record.  Returns the new row id."""
    now = datetime.now(timezone.utc).isoformat()
    result_json = json.dumps(result, ensure_ascii=False)
    # Build a text preview from the first page
    preview_chars: list[str] = []
    for line in (result[0] if result else []):
        preview_chars.append(line.get("text", ""))
    text_preview = " ".join(preview_chars)[:200]

    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO ocr_history (filename, page_count, result_json, text_preview, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (filename, page_count, result_json, text_preview, now),
        )
        return cur.lastrowid or 0


def list_records(limit: int = 50, offset: int = 0) -> list[OCRRecord]:
    """Return recent OCR records ordered by newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, filename, page_count, result_json, text_preview, created_at "
            "FROM ocr_history ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
    return [OCRRecord(**dict(r)) for r in rows]


def get_record(record_id: int) -> OCRRecord | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, filename, page_count, result_json, text_preview, created_at "
            "FROM ocr_history WHERE id = ?",
            (record_id,),
        ).fetchone()
    return OCRRecord(**dict(row)) if row else None


def delete_record(record_id: int) -> bool:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM ocr_history WHERE id = ?", (record_id,))
        return cur.rowcount > 0
