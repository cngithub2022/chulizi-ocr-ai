# Repository Guidelines

chulizi-ocr-ai is a cross-platform OCR desktop application built on PaddleOCR. It runs as a Python FastAPI backend + Electron/React frontend, with the option to compile the backend into a standalone binary for distribution.

## Project Structure

```
chulizi-ocr-ai/
├── backend/                 # Python OCR backend (FastAPI + PaddleOCR)
│   ├── main.py             # FastAPI server entry point
│   ├── ocr_engine.py       # PaddleOCR engine wrapper (predict() API)
│   ├── database.py         # SQLite OCR history persistence
│   ├── model_manager.py    # First-run model download manager
│   ├── build.spec          # PyInstaller spec for production builds
│   ├── pyproject.toml      # Python deps + ruff/mypy/pytest config
│   └── tests/test_ocr.py   # Pytest test suite
├── frontend/               # Electron + React + TypeScript desktop app
│   ├── electron/
│   │   ├── main.cjs        # Electron main process (backend lifecycle)
│   │   └── preload.cjs     # IPC bridge
│   ├── src/
│   │   ├── App.tsx         # Main layout (panels, loading overlay, toasts)
│   │   ├── components/     # UI components
│   │   │   ├── Header.tsx  # Title bar, theme toggle, lang switch, history
│   │   │   ├── DropZone.tsx # Drag-and-drop file upload with animations
│   │   │   ├── ImageCanvas.tsx  # Zoom/pan + detection box overlay
│   │   │   ├── ResultPanel.tsx  # Text/JSON view, hover-link with boxes
│   │   │   ├── BatchPanel.tsx   # Batch queue management
│   │   │   ├── HistoryPanel.tsx # OCR history sidebar
│   │   │   └── Toast.tsx        # Toast notification component
│   │   ├── hooks/
│   │   │   ├── useOcr.ts   # API calls, batch, history, toasts
│   │   │   └── useTheme.ts # Dark/light mode
│   │   ├── i18n/           # Multi-language (zh-CN default, en)
│   │   └── lib/utils.ts    # Shared utilities
│   ├── build/              # macOS entitlements for signing
│   └── package.json        # Dependencies + electron-builder config
├── scripts/
│   └── build-backend.sh    # PyInstaller build script
├── .gitignore
└── AGENTS.md
```

## Development Workflow

### Terminal 1 — Backend

```bash
cd backend
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 main.py
# Starts on http://127.0.0.1:8000 (hot reload enabled)
```

### Terminal 2 — Frontend (browser)

```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

### Terminal 3 — Electron desktop (optional)

```bash
cd frontend
npm run electron:dev
# Requires Vite dev server running on :5173
```

## Production Build

### Step 1 — Compile backend to standalone binary

```bash
bash scripts/build-backend.sh
# Creates backend/dist/ocr-backend (~200MB+ with PaddlePaddle)
```

### Step 2 — Package Electron app

```bash
cd frontend
npm run electron:build:mac    # macOS DMG
npm run electron:build:win    # Windows NSIS installer
```

The packaged app includes the PyInstaller-compiled backend in `extraResources`.
On first launch, the Electron main process spawns the backend and waits for
it to become healthy before showing the window.

## Architecture

```
Electron App
  ├── Main Process (electron/main.cjs)
  │   ├── Dev: expects backend on localhost:8000
  │   └── Prod: spawns PyInstaller binary on :18080
  ├── Renderer (React + Tailwind + shadcn/ui)
  │   ├── i18n: zh-CN / en toggle in header
  │   ├── Drag-drop → FastAPI → detection color overlay
  │   ├── Hover-linked image boxes ↔ result text
  │   ├── Toast notifications for errors/progress
  │   └── History sidebar with SQLite persistence
  └── Python Backend (FastAPI + PaddleOCR)
      ├── POST /api/ocr (single image)
      ├── POST /api/ocr/batch (multiple images)
      ├── POST /api/ocr/pdf (PDF documents)
      ├── GET /api/history (+ DELETE)
      └── GET /api/health
```

## Key Decisions

- **PaddleOCR 3.7**: uses `predict()` API (not deprecated `ocr()`), returns
  dict-like `OCRResult` objects (`rec_texts`, `rec_scores`, `dt_polys`)
- **Box alignment**: `use_doc_unwarping=False` keeps detection coordinates
  in the original image space
- **Offline model cache**: First run downloads ~180MB of models to `~/.paddlex/`;
  subsequent runs are fully offline
- **Electron title bar**: macOS `hiddenInset` with 88px left padding for
  traffic light buttons
