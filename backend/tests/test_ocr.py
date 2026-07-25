"""Tests for the OCR engine (using a generated test image)."""

import json
import sys
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ocr_engine import OCREngine


@pytest.fixture(scope="session")
def test_image(tmp_path_factory: pytest.TempPathFactory) -> Path:
    img = Image.new("RGB", (600, 200), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "Hello OCR World\nPaddleOCR Test\nApple Silicon", fill="black")
    path = tmp_path_factory.mktemp("data") / "test_ocr.png"
    img.save(str(path))
    return path


@pytest.fixture(scope="session")
def engine() -> OCREngine:
    return OCREngine(lang="ch")


def test_ocr_returns_list(engine: OCREngine, test_image: Path) -> None:
    result = engine.ocr(test_image)
    assert isinstance(result, list), f"Expected list, got {type(result)}"


def test_ocr_detects_text(engine: OCREngine, test_image: Path) -> None:
    result = engine.ocr(test_image)
    assert len(result) > 0, "No text detected in test image"
    all_text = " ".join(line["text"] for line in result)
    assert "Hello" in all_text or "hello" in all_text.lower(), (
        f"Expected 'Hello' in result, got: {all_text}"
    )


def test_ocr_result_structure(engine: OCREngine, test_image: Path) -> None:
    result = engine.ocr(test_image)
    for line in result:
        assert "text" in line, "Missing 'text' key"
        assert "confidence" in line, "Missing 'confidence' key"
        assert "box" in line, "Missing 'box' key"
        assert 0 <= line["confidence"] <= 1, (
            f"Confidence out of range: {line['confidence']}"
        )


def test_ocr_serializable(engine: OCREngine, test_image: Path) -> None:
    result = engine.ocr(test_image)
    dumped = json.dumps(result, ensure_ascii=False)
    loaded = json.loads(dumped)
    assert len(loaded) == len(result)


def test_ocr_empty_image(engine: OCREngine, tmp_path: Path) -> None:
    img = Image.new("RGB", (100, 100), color="white")
    path = tmp_path / "blank.png"
    img.save(str(path))
    result = engine.ocr(path)
    assert isinstance(result, list)
