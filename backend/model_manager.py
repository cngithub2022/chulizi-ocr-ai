"""First-run model download manager for PaddleOCR."""

import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable

from ocr_engine import MODEL_CACHE_DIR, _ensure_writable_dirs

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int, int, str], None]  # current, total, phase


def models_are_downloaded() -> bool:
    """Check if PaddleOCR models have been downloaded.

    PaddleX stores models under PADDLE_PDX_CACHE_HOME (~/.paddlex/models/...).
    We check a few key sub-directories.
    """
    pdx_home = Path(os.environ.get("PADDLE_PDX_CACHE_HOME", str(MODEL_CACHE_DIR)))
    # Signature: look for PP-OCR model directories
    model_dirs = list(pdx_home.rglob("*inference*"))
    return len(model_dirs) > 0


def check_connectivity() -> bool:
    """Quick connectivity test to verify PyPI / model hosters are reachable."""
    for host in ("pypi.org", "huggingface.co", "paddle-model-ecology.bj.bcebos.com"):
        ret = subprocess.run(
            [sys.executable, "-c",
             f"import urllib.request; "
             f"urllib.request.urlopen('https://{host}', timeout=3)"],
            capture_output=True,
            timeout=5,
        )
        if ret.returncode == 0:
            return True
    return False


def download_models(progress: ProgressCallback | None = None) -> None:
    """Trigger PaddleOCR initialisation which auto-downloads models.

    This is a blocking call; run it in a background thread during setup.
    """
    _ensure_writable_dirs()
    if progress:
        progress(0, 1, "Initializing OCR engine ...")

    try:
        from paddleocr import PaddleOCR as _PaddleOCR
    except ImportError as exc:
        raise RuntimeError(
            "PaddleOCR is not installed. Run `pip install paddleocr`."
        ) from exc

    if progress:
        progress(0, 1, "Downloading models (first run) ...")

    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "False"

    # Force model download by initialising the OCR pipeline
    ocr = _PaddleOCR(lang="ch", use_textline_orientation=False)

    if progress:
        progress(1, 1, "Models ready!")

    logger.info("Models downloaded and cached at %s", MODEL_CACHE_DIR)


def clean_models() -> None:
    """Remove cached models."""
    shutil.rmtree(MODEL_CACHE_DIR, ignore_errors=True)
    logger.info("Model cache cleared.")
