import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ScanLine } from "lucide-react";
import { I18nProvider } from "@/i18n";
import { useOcr, type OCRLine } from "@/hooks/useOcr";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/Header";
import DropZone from "@/components/DropZone";
import ImageCanvas from "@/components/ImageCanvas";
import ResultPanel from "@/components/ResultPanel";
import BatchPanel from "@/components/BatchPanel";
import HistoryPanel from "@/components/HistoryPanel";
import ToastContainer from "@/components/Toast";
import UpdateBanner from '@/components/UpdateBanner';

function AppContent() {
  const { dark, toggleTheme } = useTheme();
  const {
    engineReady, checkingEngine, loading, result, error, batchQueue,
    history, historyLoading, toasts,
    runOcr, addToBatch, processBatch,
    removeFromBatch, clearBatch, setResult,
    fetchHistory, loadHistoryResult, deleteHistoryRecord,
    dismissToast,
  } = useOcr();

  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "boxes" | "text" | "heatmap">("boxes");
  const [activeBoxIndex, setActiveBoxIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Reset page when result changes
  const totalPages = result?.pages?.length ?? 1;
  if (currentPage >= totalPages) setCurrentPage(0);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      setCurrentFile(file);
      setCurrentPreview(previewUrl);
      await runOcr(file);
    },
    [runOcr]
  );

  const handleHistoryLoad = useCallback(
    async (record: any) => {
      await loadHistoryResult(record);
      setHistoryOpen(false);
    },
    [loadHistoryResult]
  );

  const currentLines: OCRLine[] = result?.pages?.[currentPage] ?? [];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Engine loading screen */}
      {checkingEngine && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">正在准备 OCR 引擎 ...</p>
          <p className="text-xs text-muted-foreground">
            {window.electronAPI ? "首次启动需加载模型，约需 10-20 秒" : "正在连接后端服务"}
          </p>
        </div>
      )}
      <Header
        dark={dark}
        onToggleTheme={toggleTheme}
        onHistoryClick={() => setHistoryOpen((h) => !h)}
        historyOpen={historyOpen}
      />
      <UpdateBanner />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-w-0">
          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            <AnimatePresence mode="wait">
              {!currentPreview ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center p-6"
                >
                  <DropZone onFileSelect={handleFileSelect} loading={loading} />
                </motion.div>
              ) : (
                <motion.div
                  key="canvas"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Toolbar */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 ml-[76px] xl:ml-0">
                    {(["original", "boxes", "text", "heatmap"] as const).map(
                      (mode) => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            viewMode === mode
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}>
                          {mode === "original" ? "原图" : mode === "boxes" ? "检测框" : mode === "text" ? "文字" : "热力图"}
                        </button>
                      )
                    )}
                    <div className="flex-1" />
                    {loading && (
                      <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        识别中 ...
                      </span>
                    )}

                    {/* Page navigation for multi-page results */}
                    {result && result.pages.length > 1 && !loading && (
                      <div className="flex items-center gap-1 px-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                          disabled={currentPage === 0}
                          className="px-2 py-0.5 text-xs rounded bg-accent hover:bg-accent/80 disabled:opacity-30 transition-colors"
                        >
                          ◀
                        </button>
                        <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                          {currentPage + 1} / {result.pages.length}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(result.pages.length - 1, p + 1))}
                          disabled={currentPage >= result.pages.length - 1}
                          className="px-2 py-0.5 text-xs rounded bg-accent hover:bg-accent/80 disabled:opacity-30 transition-colors"
                        >
                          ▶
                        </button>
                      </div>
                    )}

                    <button onClick={() => { setCurrentFile(null); setCurrentPreview(null); setResult(null); }}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
                      关闭
                    </button>
                  </div>

                  {/* Canvas with loading overlay */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Loading overlay */}
                    {loading && (
                      <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <ScanLine className="w-5 h-5 text-primary absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
                        </div>
                        <p className="text-sm text-foreground font-medium animate-pulse">正在识别文字 ...</p>
                        <p className="text-xs text-muted-foreground">大图可能需要几秒钟</p>
                      </div>
                    )}

                    {/* Error banner */}
                    {error && !loading && (
                      <div className="absolute top-0 left-0 right-0 z-10 mx-4 mt-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setResult(null)} className="shrink-0 opacity-60 hover:opacity-100">
                          关闭
                        </button>
                      </div>
                    )}

                    <ImageCanvas
                      imageUrl={currentPreview!}
                      lines={currentLines}
                      viewMode={viewMode}
                      activeBoxIndex={activeBoxIndex}
                      onBoxHover={setActiveBoxIndex}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History sidebar */}
          <HistoryPanel
            open={historyOpen}
            records={history}
            loading={historyLoading}
            onClose={() => setHistoryOpen(false)}
            onLoad={handleHistoryLoad}
            onDelete={deleteHistoryRecord}
            onRefresh={fetchHistory}
          />
        </div>

        {/* Result panel */}
        <AnimatePresence>
          {result && currentLines.length > 0 && (
            <motion.div key="result-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border overflow-hidden flex-shrink-0">
              <ResultPanel lines={currentLines} allPages={result.pages} filename={result.filename}
                activeBoxIndex={activeBoxIndex} onLineHover={setActiveBoxIndex}
                loading={loading} error={error} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <BatchPanel files={batchQueue} onAdd={addToBatch} onProcess={processBatch}
        onRemove={removeFromBatch} onClear={clearBatch}
        onSelect={(file) => {
          if (file.result) { setResult(file.result); setCurrentPreview(file.previewUrl); setCurrentFile(file.file); }
        }} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
