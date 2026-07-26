import { useState, useRef, useEffect } from "react";
import { Moon, Sun, History, Scan, Settings, RefreshCw, Camera } from "lucide-react";
import { useI18n } from "@/i18n";

interface HeaderProps {
  dark: boolean;
  onToggleTheme: () => void;
  onHistoryClick: () => void;
  historyOpen: boolean;
}

export default function Header({
  dark, onToggleTheme, onHistoryClick, historyOpen,
}: HeaderProps) {
  const { t, toggleLocale, locale } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const ref = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCheckUpdates = async () => {
    if (!window.electronAPI) return;
    setSettingsOpen(false);
    window.electronAPI.openReleasePage();
  };

  const handleScreenshot = async () => {
    if (window.electronAPI) {
      await window.electronAPI.triggerScreenshot();
    }
  };

  const headerStyle: Record<string, string> = { paddingLeft: isMac ? "88px" : "1.25rem", WebkitAppRegion: "drag" };
  const noDrag: Record<string, string> = { WebkitAppRegion: "no-drag" };

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 backdrop-blur-sm" style={headerStyle}>
      <div className="flex items-center gap-3" style={noDrag}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Scan className="w-4 h-4 text-primary" />
        </div>
        <h1 className="text-sm font-semibold text-foreground">{t.app.title}</h1>
      </div>

      <div className="flex items-center gap-1" style={noDrag}>
        {/* Language toggle */}
        <div className="flex items-center bg-accent/60 rounded-md overflow-hidden border border-border/50 text-xs">
          <button onClick={() => locale !== "zh" && toggleLocale()}
            className={`px-2.5 py-1.5 transition-colors ${locale === "zh" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            中
          </button>
          <button onClick={() => locale !== "en" && toggleLocale()}
            className={`px-2.5 py-1.5 transition-colors ${locale === "en" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            EN
          </button>
        </div>

        {/* Screenshot OCR button */}
        <button onClick={handleScreenshot}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={locale === "zh" ? "截图 OCR (⌘⇧O)" : "Screenshot OCR (⌘⇧O)"}>
          <Camera className="w-4 h-4" />
        </button>

        {/* Settings dropdown */}
        <div className="relative" ref={ref}>
          <button onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Settings">
            <Settings className="w-4 h-4"}
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-popover border border-border shadow-lg z-50 py-1">
              <button onClick={handleCheckUpdates}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors text-left">
                <RefreshCw className="w-3.5 h-3.5" />
                {locale === "zh" ? "前往 Releases 下载最新版" : "View Releases"}
              </button>
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">
                v{typeof window !== "undefined" && window.electronAPI?.appVersion || "0.0.0"}
              </div>
            </div>
          )}
        </div>

        <button onClick={onHistoryClick}
          className={`p-2 rounded-md transition-colors ${historyOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          title={t.header.history}>
          <History className="w-4 h-4" />
        </button>

        <button onClick={onToggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={dark ? t.header.lightMode : t.header.darkMode}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
