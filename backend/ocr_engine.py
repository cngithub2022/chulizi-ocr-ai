"""PaddleOCR engine wrapper with lazy initialization and structured output."""

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# App-specific data (history.db, temp files) — keep separate from PaddleOCR cache
OCR_APP_HOME = os.environ.get("OCR_APP_HOME", str(Path.home() / ".ocr-app"))
APP_DATA_DIR = Path(OCR_APP_HOME)
# Do NOT override PADDLE_PDX_CACHE_HOME — let PaddleOCR use its default ~/.paddlex/


def _ensure_writable_dirs() -> None:
    """Ensure app data directories exist."""
    for d in [APP_DATA_DIR, APP_DATA_DIR / "temp"]:
        d.mkdir(parents=True, exist_ok=True)


_ensure_writable_dirs()


class OCREngine:
    """Lazy-initialized PaddleOCR wrapper (PaddleOCR 3.7+ predict API)."""

    def __init__(self, lang: str = "ch", **kwargs: Any) -> None:
        self._lang = lang
        self._kwargs = kwargs
        self._ocr: Any = None

    def _initialize(self) -> None:
        if self._ocr is not None:
            return
        try:
            from paddleocr import PaddleOCR as _PaddleOCR
        except ImportError as exc:
            raise RuntimeError(
                "PaddleOCR is not installed. Run `pip install paddleocr`."
            ) from exc

        logger.info("Initializing PaddleOCR (lang=%s) ...", self._lang)

        kwargs = {
            "lang": self._lang,
            "use_textline_orientation": True,
            "use_doc_unwarping": False,
            **self._kwargs,
        }
        self._ocr = _PaddleOCR(**kwargs)
        logger.info("PaddleOCR ready.")

    def ocr(self, image_path: str | Path) -> list[dict[str, Any]]:
        """Run OCR on a single image."""
        self._initialize()
        result = self._ocr.predict(str(image_path))
        return self._parse_result(result)

    def ocr_batch(self, image_paths: list[str | Path]) -> list[list[dict[str, Any]]]:
        self._initialize()
        all_results: list[list[dict[str, Any]]] = []
        for path in image_paths:
            result = self._ocr.predict(str(path))
            all_results.append(self._parse_result(result))
        return all_results

    def ocr_pdf(self, pdf_path: str | Path, dpi: int = 300) -> list[list[dict[str, Any]]]:
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError(
                "PyMuPDF is required for PDF support. Run `pip install pymupdf`."
            ) from exc

        doc = fitz.open(str(pdf_path))
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        paths: list[Path] = []
        tmp_dir = APP_DATA_DIR / "temp_pages"
        tmp_dir.mkdir(parents=True, exist_ok=True)

        for i, page in enumerate(doc):
            out = tmp_dir / f"page_{i + 1:04d}.png"
            page.get_pixmap(matrix=mat).save(str(out))
            paths.append(out)
        doc.close()

        return self.ocr_batch(paths)

    @staticmethod
    def _parse_result(raw: Any) -> list[dict[str, Any]]:
        lines: list[dict[str, Any]] = []
        for page in raw:
            texts: list[str] = page.get("rec_texts") or []
            scores: list[float] = page.get("rec_scores") or []
            boxes: list[Any] = (
                page.get("dt_polys")
                or page.get("rec_polys")
                or page.get("rec_boxes")
                or []
            )

            for i in range(len(texts)):
                text = texts[i]
                score = float(scores[i]) if i < len(scores) else 0.0
                box = boxes[i] if i < len(boxes) else []
                clean_box: list[list[float]] = []
                for point in box:
                    clean_box.append([float(point[0]), float(point[1])])
                lines.append({
                    "text": text,
                    "confidence": round(score, 4),
                    "box": clean_box,
                })
        return lines
