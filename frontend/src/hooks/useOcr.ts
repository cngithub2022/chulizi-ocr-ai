import { useState, useCallback, useEffect } from "react";
import { getBackendUrl } from "@/lib/utils";

export interface OCRLine {
  text: string;
  confidence: number;
  box: [[number, number], [number, number], [number, number], [number, number]];
}

export interface OCRResult {
  id: number;
  filename: string;
  pages: OCRLine[][];
}

export interface HistoryRecord {
  id: number;
  filename: string;
  page_count: number;
  result_json: string;
  text_preview: string;
  created_at: string;
}

export interface BatchFile {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "done" | "error";
  result?: OCRResult;
  error?: string;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

const REQUEST_TIMEOUT = 180_000;

function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ---- Export helpers ----
export function generateHtmlExport(allPages: OCRLine[][], filename: string): string {
  const body = allPages.map((lines, pi) => `
    <div class="page">
      ${allPages.length > 1 ? `<h2>Page ${pi + 1}</h2>` : ""}
      <table>
        <thead><tr><th>#</th><th>Text</th><th>Confidence</th></tr></thead>
        <tbody>
          ${lines.map((l, i) => `<tr><td>${i + 1}</td><td>${l.text}</td><td>${(l.confidence * 100).toFixed(0)}%</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>OCR Result - ${filename}</title>
<style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}
  h1{font-size:1.5em;border-bottom:2px solid #3b82f6;padding-bottom:8px}
  h2{font-size:1.1em;color:#555;margin-top:30px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #eee;font-size:14px}
  th{background:#f5f5f5;font-weight:600}
  .meta{color:#888;font-size:12px;margin-bottom:20px}
</style></head><body>
<h1>OCR Result</h1>
<div class="meta">File: ${filename} | Pages: ${allPages.length} | ${new Date().toLocaleString("zh-CN")}</div>
${body}
</body></html>`;
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useOcr() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchQueue, setBatchQueue] = useState<BatchFile[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [engineReady, setEngineReady] = useState(false);
  const [checkingEngine, setCheckingEngine] = useState(true);

  const backendUrl = getBackendUrl();

  // ---- Toast ----
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---- Wait for backend then warm up engine ----
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      // Step 1: wait for backend to be reachable
      for (let i = 0; i < 30; i++) {
        if (cancelled) return;
        try {
          const res = await fetch(backendUrl + "/api/health");
          if (res.ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (cancelled) return;
      // Step 2: warm up OCR engine (blocks 10-20s on first run)
      try {
        const res = await fetch(backendUrl + "/api/warmup");
        if (!cancelled) {
          if (res.ok) {
            setEngineReady(true);
          } else {
            addToast("error", "OCR 引擎启动失败");
          }
          setCheckingEngine(false);
        }
      } catch {
        if (!cancelled) {
          setCheckingEngine(false);
          addToast("error", "OCR 引擎加载失败，请重启应用");
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [backendUrl, addToast]);

  // ---- Health check ----
  const checkBackend = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetchWithTimeout(`${backendUrl}/api/health`, {}, 3000);
      return res.ok;
    } catch { return false; }
  }, [backendUrl]);

  // ---- OCR (image) ----
  const processFile = useCallback(async (file: File): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithTimeout(`${backendUrl}/api/ocr`, { method: "POST", body: formData }, REQUEST_TIMEOUT);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OCR failed (${res.status}): ${text}`);
    }
    return res.json();
  }, [backendUrl]);

  // ---- PDF OCR ----
  const processPdf = useCallback(async (file: File): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithTimeout(`${backendUrl}/api/ocr/pdf`, { method: "POST", body: formData }, REQUEST_TIMEOUT);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PDF OCR failed (${res.status}): ${text}`);
    }
    return res.json();
  }, [backendUrl]);

  // ---- Auto-detect file type & run ----
  const runOcr = useCallback(async (file: File) => {
    const alive = await checkBackend();
    if (!alive) {
      addToast("error", "后端服务未启动");
      return;
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = isPdf ? await processPdf(file) : await processFile(file);
      setResult(r);
      const pages = r.pages?.length || 1;
      addToast("success", `识别完成 — ${r.filename}${pages > 1 ? ` (${pages}页)` : ""}`);
      fetchHistory();
    } catch (e: any) {
      const msg = e.name === "AbortError" ? "识别超时" : e.message || "识别失败";
      setError(msg);
      addToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [processFile, processPdf, checkBackend, addToast]);

  // ---- History ----
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/history`);
      if (res.ok) setHistory(await res.json());
    } catch {} finally { setHistoryLoading(false); }
  }, [backendUrl]);

  const loadHistoryResult = useCallback(async (record: HistoryRecord) => {
    try {
      const pages = JSON.parse(record.result_json);
      setResult({ id: record.id, filename: record.filename, pages });
      setError(null);
    } catch (e: any) {
      setError("Failed to load history: " + e.message);
      addToast("error", "无法加载历史记录");
    }
  }, [addToast]);

  const deleteHistoryRecord = useCallback(async (recordId: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/history/${recordId}`, { method: "DELETE" });
      if (res.ok) setHistory((prev) => prev.filter((r) => r.id !== recordId));
    } catch {}
  }, [backendUrl]);

  // ---- Batch ----
  const addToBatch = useCallback((files: File[]) => {
    setBatchQueue((prev) => [...prev, ...files.map((f) => ({
      id: crypto.randomUUID(), file: f,
      previewUrl: URL.createObjectURL(f), status: "pending" as const,
    }))]);
  }, []);

  const processBatch = useCallback(async () => {
    const pending = batchQueue.filter((f) => f.status === "pending");
    if (pending.length === 0) return;
    const updated = [...batchQueue];
    for (const item of pending) {
      const idx = updated.findIndex((u) => u.id === item.id);
      if (idx === -1) continue;
      updated[idx] = { ...updated[idx], status: "processing" };
      setBatchQueue([...updated]);
      try {
        const isPdf = item.file.type === "application/pdf" || item.file.name.toLowerCase().endsWith(".pdf");
        const r = isPdf ? await processPdf(item.file) : await processFile(item.file);
        updated[idx] = { ...updated[idx], status: "done", result: r };
      } catch (e: any) {
        updated[idx] = { ...updated[idx], status: "error", error: e.message };
      }
      setBatchQueue([...updated]);
    }
    addToast("success", `批量处理完成 (${pending.length} 个文件)`);
    fetchHistory();
  }, [batchQueue, processFile, processPdf, addToast]);

  const removeFromBatch = useCallback((id: string) => setBatchQueue((prev) => prev.filter((f) => f.id !== id)), []);
  const clearBatch = useCallback(() => setBatchQueue([]), []);

  return {
    engineReady,
    checkingEngine,
    loading,
    result,
    error,
    batchQueue,
    history,
    historyLoading,
    toasts,
    runOcr,
    addToBatch,
    processBatch,
    removeFromBatch,
    clearBatch,
    setResult,
    fetchHistory,
    loadHistoryResult,
    deleteHistoryRecord,
    dismissToast,
  };
}
