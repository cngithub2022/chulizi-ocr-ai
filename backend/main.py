"""FastAPI server for OCR application."""

import json
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ocr_engine import OCREngine
from database import init_db, add_record, list_records, get_record, delete_record, OCRRecord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OCR App Backend", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine: Optional[OCREngine] = None


def get_engine() -> OCREngine:
    global _engine
    if _engine is None:
        lang = os.environ.get("OCR_LANG", "ch")
        logger.info("Creating OCREngine(lang=%s)", lang)
        _engine = OCREngine(lang=lang)
    return _engine


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup() -> None:
    init_db()
    logger.info("Database initialised")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/api/warmup")
async def warmup() -> JSONResponse:
    """Initialize OCR engine (blocks until loaded). Frontend calls this on startup."""
    try:
        engine = get_engine()
        engine._initialize()
        return JSONResponse({"status": "ok", "engine_ready": True})
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

@app.post("/api/ocr")
async def ocr_endpoint(
    file: UploadFile = File(...),
    engine: OCREngine = Depends(get_engine),
) -> JSONResponse:
    if not file.filename:
        raise HTTPException(400, "No file provided")

    suffix = Path(file.filename).suffix or ".png"
    tmp = Path(tempfile.gettempdir()) / f"ocr_{uuid.uuid4().hex}{suffix}"
    try:
        content = await file.read()
        tmp.write_bytes(content)
        try:
            result = engine.ocr(tmp)
        except Exception as ocr_err:
            logger.exception(f"OCR processing failed: {ocr_err}")
            raise HTTPException(500, f"OCR error: {ocr_err}")
        wrapped = [result]
        record_id = add_record(file.filename, 1, wrapped)
        return JSONResponse({
            "id": record_id,
            "filename": file.filename,
            "pages": [result],
        })
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


@app.post("/api/ocr/batch")
async def ocr_batch_endpoint(
    files: list[UploadFile] = File(...),
    engine: OCREngine = Depends(get_engine),
) -> JSONResponse:
    results: list[dict[str, Any]] = []
    tmp_files: list[Path] = []
    try:
        for f in files:
            suffix = Path(f.filename).suffix or ".png"
            tmp = Path(tempfile.gettempdir()) / f"ocr_{uuid.uuid4().hex}{suffix}"
            content = await f.read()
            tmp.write_bytes(content)
            tmp_files.append(tmp)
            page_result = engine.ocr(tmp)
            results.append({"filename": f.filename, "texts": page_result})

        record_id = add_record(
            f"[batch] {files[0].filename} +{len(files) - 1}",
            len(files),
            [r["texts"] for r in results],
        )
        return JSONResponse({"id": record_id, "files": results})
    finally:
        for p in tmp_files:
            if p.exists():
                p.unlink(missing_ok=True)


@app.post("/api/ocr/pdf")
async def ocr_pdf_endpoint(
    file: UploadFile = File(...),
    engine: OCREngine = Depends(get_engine),
) -> JSONResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    tmp_pdf = Path(tempfile.gettempdir()) / f"ocr_{uuid.uuid4().hex}.pdf"
    try:
        content = await file.read()
        tmp_pdf.write_bytes(content)
        pages = engine.ocr_pdf(tmp_pdf)
        results = [{"page": i + 1, "texts": page_res} for i, page_res in enumerate(pages)]
        record_id = add_record(file.filename, len(pages), pages)
        return JSONResponse({
            "id": record_id,
            "filename": file.filename,
            "total_pages": len(pages),
            "pages": results,
        })
    finally:
        if tmp_pdf.exists():
            tmp_pdf.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

@app.get("/api/history")
async def history_list(limit: int = 50, offset: int = 0) -> JSONResponse:
    records = list_records(limit=limit, offset=offset)
    return JSONResponse([r.model_dump() for r in records])


@app.get("/api/history/{record_id}")
async def history_detail(record_id: int) -> JSONResponse:
    record = get_record(record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    return JSONResponse(record.model_dump())


@app.delete("/api/history/{record_id}")
async def history_delete(record_id: int) -> JSONResponse:
    ok = delete_record(record_id)
    if not ok:
        raise HTTPException(404, "Record not found")
    return JSONResponse({"deleted": True})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("OCR_PORT", "8000"))
    # reload=True only for development (not for compiled binary)
    dev_mode = os.environ.get("OCR_RELOAD", "").lower() == "true"
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        reload=dev_mode,
    )
