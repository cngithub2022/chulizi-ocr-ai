import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Copy, Download, FileJson, FileText, Loader2,
  ArrowRight, FileCode2, Printer,
} from "lucide-react";
import { confidenceColor } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { OCRLine } from "@/hooks/useOcr";
import { generateHtmlExport, downloadFile } from "@/hooks/useOcr";

interface ResultPanelProps {
  lines: OCRLine[];
  allPages: OCRLine[][];
  filename: string;
  activeBoxIndex: number | null;
  onLineHover: (index: number | null) => void;
  loading: boolean;
  error: string | null;
}

export default function ResultPanel({
  lines, allPages, filename, activeBoxIndex, onLineHover, loading, error,
}: ResultPanelProps) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<"text" | "json">("text");
  const [copied, setCopied] = useState(false);

  const plainText = useMemo(() => lines.map((l) => l.text).join("\n"), [lines]);
  const jsonText = useMemo(() => JSON.stringify(lines, null, 2), [lines]);
  const avgConfidence = useMemo(() => {
    if (lines.length === 0) return 0;
    return lines.reduce((s, l) => s + l.confidence, 0) / lines.length;
  }, [lines]);

  const baseName = filename.replace(/\.[^.]+$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(viewMode === "text" ? plainText : jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    downloadFile(plainText, `${baseName}_ocr.txt`, "text/plain");
  };

  const handleExportJson = () => {
    downloadFile(jsonText, `${baseName}_ocr.json`, "application/json");
  };

  const handleExportHtml = () => {
    const html = generateHtmlExport(allPages, filename);
    downloadFile(html, `${baseName}_ocr.html`, "text/html");
  };

  const handleExportPdf = () => {
    // Use the browser's print dialog with a data URI for clean PDF output
    const html = generateHtmlExport(allPages, filename);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{t.dropzone.processing}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive text-lg font-bold">!</span>
        </div>
        <p className="text-sm text-destructive text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground truncate">{filename}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setViewMode("text")}
            className={`p-1.5 rounded transition-colors ${viewMode === "text" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title={t.result.textView}><FileText className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("json")}
            className={`p-1.5 rounded transition-colors ${viewMode === "json" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title={t.result.jsonView}><FileJson className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{lines.length} {t.result.lines}</span>
        <span className="flex items-center gap-1">
          {t.result.avgConfidence}:
          <span className="font-medium" style={{ color: confidenceColor(avgConfidence) }}>
            {(avgConfidence * 100).toFixed(0)}%
          </span>
        </span>
        {allPages.length > 1 && <span>{allPages.length} 页</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === "text" ? (
          <div className="space-y-1">
            {lines.map((line, i) => {
              const isActive = activeBoxIndex === i;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onMouseEnter={() => onLineHover(i)}
                  onMouseLeave={() => onLineHover(null)}
                  className={`
                    relative px-3 py-2.5 rounded-lg text-sm cursor-pointer
                    transition-all duration-150
                    ${isActive
                      ? "bg-primary/15 border border-primary/40 shadow-sm shadow-primary/10 scale-[1.01]"
                      : "hover:bg-accent/60 border border-transparent text-foreground/80 hover:text-foreground"
                    }
                  `}>
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] mt-1 w-6 shrink-0 font-mono rounded text-center ${
                      isActive ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <span className={`flex-1 leading-relaxed ${isActive ? "text-foreground font-medium" : ""}`}>
                      {line.text}
                    </span>
                    <span className="text-[10px] shrink-0 mt-0.5 font-mono px-1.5 py-0.5 rounded"
                      style={{ color: confidenceColor(line.confidence), backgroundColor: `${confidenceColor(line.confidence)}15` }}>
                      {(line.confidence * 100).toFixed(0)}%
                    </span>
                    {isActive && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -left-0.5 top-1/2 -translate-y-1/2 text-primary">
                        <ArrowRight className="w-3 h-3" />
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <pre className="text-xs leading-relaxed text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono">
            {jsonText}
          </pre>
        )}
      </div>

      {/* Export actions footer */}
      <div className="px-4 py-3 border-t border-border bg-card/50">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Row 1: Copy + Text + JSON */}
          <button onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors">
            <Copy className="w-3 h-3" />
            {copied ? t.result.copied : t.result.copy}
          </button>

          {/* Separator */}
          <span className="w-px h-4 bg-border mx-0.5" />

          <button onClick={handleExportTxt}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors"
            title="Export TXT">
            <FileText className="w-3 h-3" />TXT
          </button>
          <button onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors"
            title="Export JSON">
            <FileJson className="w-3 h-3" />JSON
          </button>

          {/* Row 2: HTML + PDF */}
          <button onClick={handleExportHtml}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors"
            title="Export HTML">
            <FileCode2 className="w-3 h-3" />HTML
          </button>
          <button onClick={handleExportPdf}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            title="Export PDF (via browser print)">
            <Printer className="w-3 h-3" />PDF
          </button>
        </div>
      </div>
    </div>
  );
}
