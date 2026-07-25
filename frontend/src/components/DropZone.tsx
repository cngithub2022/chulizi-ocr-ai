import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, FileImage, FileText, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  loading: boolean;
}

export default function DropZone({ onFileSelect, loading }: DropZoneProps) {
  const { t } = useI18n();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length > 0) onFileSelect(accepted[0]);
    },
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: loading,
  });

  
  return (
    <div
      {...getRootProps()}
      className={`
        w-full max-w-lg aspect-[4/3] rounded-2xl border-2 border-dashed
        flex flex-col items-center justify-center gap-4 p-8 cursor-pointer
        transition-all duration-300
        ${
          isDragActive
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        }
        ${loading ? "pointer-events-none opacity-70" : ""}
      `}
    >
      <input {...getInputProps()} />

      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>
      ) : isDragActive ? (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Upload className="w-12 h-12 text-primary" />
        </motion.div>
      ) : (
        <FileImage className="w-12 h-12 text-muted-foreground" />
      )}

      <div className="text-center">
        {loading ? (
          <p className="text-sm font-medium text-primary animate-pulse">
            {t.dropzone.processing}
          </p>
        ) : isDragActive ? (
          <p className="text-sm font-medium text-primary">{t.dropzone.dropHere}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              {t.dropzone.prompt}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              图片 PNG/JPG/BMP/TIFF/WebP · PDF
            </p>
          </>
        )}
      </div>
    </div>
  );
}
