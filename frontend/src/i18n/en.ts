import type { Translations } from "./zh";

const en: Translations = {
  app: {
    title: "OCR Desktop",
    close: "Close",
  },
  header: {
    history: "History",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    chinese: "中文",
    english: "English",
  },
  dropzone: {
    processing: "Processing OCR ...",
    dropHere: "Drop image here",
    prompt: "Drop image here or click to browse",
    formats: "PNG, JPG, BMP, TIFF, WebP",
  },
  canvas: {
    original: "Original",
    detections: "Detections",
    text: "Text",
    heatmap: "Heatmap",
    view: "View",
    close: "Close",
    confidence: "Confidence",
  },
  result: {
    textView: "Text",
    jsonView: "JSON",
    lines: "lines",
    avgConfidence: "Avg confidence",
    copy: "Copy",
    copied: "Copied!",
    export: "Export",
  },
  batch: {
    title: "Batch Queue",
    done: "done",
    addFiles: "Add files",
    process: "Process",
    clear: "Clear",
    dropToAdd: "Drop images to add to batch queue",
    dropHere: "Drop images here",
  },
  setup: {
    title: "First-time Setup",
    downloading: "Downloading OCR models ...",
    ready: "Models ready!",
    modelCache: "Models cached at",
    start: "Get Started",
  },
  error: {
    ocrFailed: "OCR failed",
    networkError: "Network error. Is the backend running?",
  },
};

export default en;
