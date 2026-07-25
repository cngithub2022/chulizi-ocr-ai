import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RotateCw, X, Loader2 } from "lucide-react";

type UpdateStatus = {
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
};

export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((data: UpdateStatus) => {
      setStatus(data);
      if (data.status === "downloaded" || data.status === "not-available" || data.status === "error") {
        // Auto-dismiss after 10s for non-actionable statuses
        if (data.status !== "downloaded") {
          setTimeout(() => setDismissed(true), 10000);
        }
      }
    });

    // Trigger initial check
    window.electronAPI.checkForUpdates?.();
    return unsub;
  }, []);

  // Only show in production (not in dev browser)
  if (!window.electronAPI) return null;
  if (dismissed) return null;

  const handleInstall = () => {
    window.electronAPI?.installUpdate?.();
  };

  const handleDismiss = () => setDismissed(true);

  if (status.status === "checking") return null; // silent
  if (status.status === "idle") return null;
  if (status.status === "not-available") return null;
  if (status.status === "error") return null; // silently ignore errors (e.g., no GitHub release yet)

  return (
    <AnimatePresence>
      {status.status === "available" && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-between px-5 py-2.5 bg-primary/10 border-b border-primary/20 text-sm"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span>新版本 v{status.version} 可用，正在后台下载 ...</span>
          </div>
          <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {status.status === "downloading" && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-5 py-2.5 bg-primary/5 border-b border-primary/10"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span>正在下载更新 ... {status.percent?.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${status.percent || 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {status.status === "downloaded" && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-between px-5 py-2.5 bg-green-500/10 border-b border-green-500/20 text-sm"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-green-500" />
            <span>v{status.version} 已下载，重启以安装</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleInstall}
              className="px-3 py-1 text-xs rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors font-medium">
              <RotateCw className="w-3 h-3 inline mr-1" />
              重启安装
            </button>
            <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
