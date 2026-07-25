#!/bin/bash
set -e
cd "$(dirname "$0")/../backend"

PYTHON="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"
[ ! -x "$PYTHON" ] && PYTHON="python3"

echo "=== Building OCR Backend Binary ==="
echo "Python: $($PYTHON --version)"

rm -rf build dist __pycache__

$PYTHON -m PyInstaller \
    --onedir \
    --name ocr-backend \
    --hidden-import paddleocr \
    --hidden-import paddlex \
    --hidden-import paddlex.inference \
    --hidden-import paddlex.inference.pipelines \
    --hidden-import paddlex.inference.models \
    --hidden-import paddlex.utils.cache \
    --hidden-import paddlex.utils.download \
    --hidden-import paddle.base \
    --hidden-import paddle.nn \
    --hidden-import paddle.vision \
    --hidden-import pydantic \
    --hidden-import PIL._imaging \
    --collect-all paddle \
    --collect-all paddleocr \
    --collect-all paddlex \
    --exclude tkinter \
    --exclude matplotlib \
    --exclude scipy \
    --exclude torch \
    --exclude torchvision \
    --exclude transformers \
    --console \
    --strip \
    main.py

echo ""
echo "=== Build complete ==="
echo "Binary: backend/dist/ocr-backend/ocr-backend"
echo "Size:  $(du -sh dist/ocr-backend | cut -f1)"
echo ""
echo "=== Quick test ==="
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
./dist/ocr-backend/ocr-backend > /tmp/ocr-test.log 2>&1 &
PID=$!
sleep 30
echo "--- Backend output ---"
cat /tmp/ocr-test.log
echo "---"

if curl -sS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    echo "BACKEND HEALTH CHECK: OK"
    kill $PID 2>/dev/null
    echo ""
    echo "========================================="
    echo " BUILD SUCCESSFUL - Backend binary works!"
    echo "========================================="
else
    echo "BACKEND HEALTH CHECK: FAILED"
    kill $PID 2>/dev/null
    echo "Check error output above"
fi
wait $PID 2>/dev/null || true
