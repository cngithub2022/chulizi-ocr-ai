import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RotateCw, X, Loader2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n";

type UpdateStatus = {
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
};

export default function UpdateBanner() {
  const { locale } = useI18n();
  const [status, setStatus] = useState<UpdateStatus>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);
  const [upToDateShown, setUpToDateShown] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((data: UpdateStatus) => {
      setStatus(data);
      setDismissed(false);

      if (data.status === "downloaded") {
        // Keep showing until user action
      } else if (data.status === "not-available") {
        setUpToDateShown(true);
        setTimeout(() => setUpToDateShown(false), 4000);
        setTimeout(() => setDismissed(true), 6000);
      } else if (data.status === "error") {
        setTimeout(() => setDismissed(true), 8000);
      } else if (data.status === "checking") {
        setTimeout(() => {
          setStatus((prev) => prev.status === "checking" ? { ...prev, status: "idle" } : prev);
        }, 15000);
      }
    });
    return unsub;
  }, []);

  if (!window.electronAPI) return null;
  if (dismissed && !upToDateShown) return null;

  const isZh = locale === "zh";

  return (
    <AnimatePresence>
      {/* Checking indicator */}
      {status.status === "checking" && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="flex items-center gap-2 px-5 py-2 bg-primary/5 border-b border-primary/10 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          {isZh ? "正在检查更新 ..." : "Checking for updates ..."}
        </motion.div>
      )}

      {/* Up to date */}
      {upToDateShown && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-between px-5 py-2 bg-green-500/10 border-b border-green-500/20 text-xs">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isZh ? "已是最新版本" : "Up to date"}
          </div>
          <button onClick={() => { setUpToDateShown(false); setDismissed(true); }}
            className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
        </motion.div>
      )}

      {/* New version available */}
      {status.status === "available" && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-between px-5 py-2.5 bg-primary/10 border-b border-primary/20 text-sm">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span>{isZh ? `新版本 v${status.version} 可用，正在后台下载 ...` : `v${status.version} available, downloading ...`}</span>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </motion.div>
      )}

      {/* Download progress */}
      {status.status === "downloading" && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="px-5 py-2.5 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span>{isZh ? `正在下载更新 ... ${status.percent}%` : `Downloading update ... ${status.percent}%`}</span>
          </div>
          <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${status.percent || 0}%` }} transition={{ duration: 0.3 }} />
          </div>
        </motion.div>
      )}

      {/* Downloaded - ready to install */}
      {status.status === "downloaded" && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-between px-5 py-2.5 bg-green-500/10 border-b border-green-500/20 text-sm">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-green-500" />
            <span>{isZh ? `v${status.version} 已下载，重启以安装` : `v${status.version} downloaded. Restart to install.`}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.electronAPI?.installUpdate()}
              className="px-3 py-1 text-xs rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors font-medium">
              <RotateCw className="w-3 h-3 inline mr-1" />
              {isZh ? "重启安装" : "Install"}
            </button>
            <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {status.status === "error" && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-between px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-600 dark:text-red-400">
          <span>{isZh ? `更新检查失败: ${status.message || "未知错误"}` : `Update check failed: ${status.message || "unknown error"}`}</span>
          <button onClick={() => setDismissed(true)} className="p-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
