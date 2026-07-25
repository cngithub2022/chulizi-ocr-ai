import { Moon, Sun, History, Scan } from "lucide-react";
import { useI18n } from "@/i18n";

interface HeaderProps {
  dark: boolean;
  onToggleTheme: () => void;
  onHistoryClick: () => void;
  historyOpen: boolean;
}

export default function Header({
  dark,
  onToggleTheme,
  onHistoryClick,
  historyOpen,
}: HeaderProps) {
  const { t, toggleLocale, locale } = useI18n();
  const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

  const headerStyle: Record<string, string> = {
    paddingLeft: isMac ? "88px" : "1.25rem",
    WebkitAppRegion: "drag",
  };

  const noDrag: Record<string, string> = {
    WebkitAppRegion: "no-drag",
  };

  return (
    <header
      className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 backdrop-blur-sm"
      style={headerStyle}
    >
      <div className="flex items-center gap-3" style={noDrag}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Scan className="w-4 h-4 text-primary" />
        </div>
        <h1 className="text-sm font-semibold text-foreground">{t.app.title}</h1>
      </div>

      <div className="flex items-center gap-1" style={noDrag}>
        {/* Language toggle */}
        <div className="flex items-center bg-accent/60 rounded-md overflow-hidden border border-border/50 text-xs">
          <button
            onClick={() => locale !== "zh" && toggleLocale()}
            className={`px-2.5 py-1.5 transition-colors ${
              locale === "zh"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            中
          </button>
          <button
            onClick={() => locale !== "en" && toggleLocale()}
            className={`px-2.5 py-1.5 transition-colors ${
              locale === "en"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
        </div>

        <button
          onClick={onHistoryClick}
          className={`p-2 rounded-md transition-colors ${
            historyOpen
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
          title={t.header.history}
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={dark ? t.header.lightMode : t.header.darkMode}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
