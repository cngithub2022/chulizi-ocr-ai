import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Trash2, FileText, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import type { HistoryRecord } from "@/hooks/useOcr";

interface HistoryPanelProps {
  open: boolean;
  records: HistoryRecord[];
  loading: boolean;
  onClose: () => void;
  onLoad: (record: HistoryRecord) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

export default function HistoryPanel({
  open,
  records,
  loading,
  onClose,
  onLoad,
  onDelete,
  onRefresh,
}: HistoryPanelProps) {
  const { t } = useI18n();

  // Fetch history when panel opens
  useEffect(() => {
    if (open) onRefresh();
  }, [open, onRefresh]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="border-l border-border bg-card/60 backdrop-blur-sm overflow-hidden flex-shrink-0"
        >
          <div className="w-80 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">历史记录</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">暂无识别记录</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    完成 OCR 识别后记录将出现在这里
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {records.map((record) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-lg p-3 hover:bg-accent/60 cursor-pointer transition-colors"
                      onClick={() => onLoad(record)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">
                            {record.filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {record.text_preview || "(empty)"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(record.created_at).toLocaleString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {record.page_count > 1 && ` · ${record.page_count}页`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(record.id);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
