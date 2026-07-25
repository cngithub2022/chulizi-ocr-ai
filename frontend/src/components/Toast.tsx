import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { Toast } from "@/hooks/useOcr";

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm max-w-sm ${COLORS[toast.type]}`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm flex-1">{toast.message}</span>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
