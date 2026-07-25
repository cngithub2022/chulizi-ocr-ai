import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown, Play, Trash2, X,
  CheckCircle2, AlertCircle, Loader2, GripVertical,
} from "lucide-react";
import { useI18n } from "@/i18n";
import type { BatchFile } from "@/hooks/useOcr";

interface BatchPanelProps {
  files: BatchFile[];
  onAdd: (files: File[]) => void;
  onProcess: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelect: (file: BatchFile) => void;
}

export default function BatchPanel({ files, onAdd, onProcess, onRemove, onClear, onSelect }: BatchPanelProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const hasPending = files.some((f) => f.status === "pending");
  const totalProgress = files.filter((f) => f.status === "done").length;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onAdd,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"] },
    disabled: !hasPending,
  });

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      <button onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-medium">{t.batch.title}</span>
          {files.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              {files.length}
            </span>
          )}
          {files.length > 0 && (
            <span className="text-[10px]">{totalProgress}/{files.length} {t.batch.done}</span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {files.length === 0 ? (
              <div {...getRootProps()} className={`mx-4 mb-3 p-4 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <input {...getInputProps()} />
                <p className="text-xs text-muted-foreground">{isDragActive ? t.batch.dropHere : t.batch.dropToAdd}</p>
              </div>
            ) : (
              <>
                <div className="px-4 pb-2 max-h-32 overflow-y-auto space-y-1">
                  <AnimatePresence>
                    {files.map((item) => (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-accent/50 group">
                        <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate flex-1">{item.file.name}</span>
                        {item.status === "pending" && <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground" />}
                        {item.status === "processing" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                        {item.status === "done" && (
                          <button onClick={() => onSelect(item)}><CheckCircle2 className="w-3.5 h-3.5 text-green-500 hover:text-green-400" /></button>
                        )}
                        {item.status === "error" && <span title={item.error}><AlertCircle className="w-3.5 h-3.5 text-destructive" /></span>}
                        <button onClick={() => onRemove(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <button {...getRootProps()} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors">
                    <input {...getInputProps()} />
                    {t.batch.addFiles}
                  </button>
                  <button onClick={onProcess} disabled={!hasPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <Play className="w-3 h-3" />{t.batch.process}
                  </button>
                  <button onClick={onClear}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3 h-3" />{t.batch.clear}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
