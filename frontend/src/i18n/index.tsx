import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import zh from "./zh";
import en from "./en";
import type { Translations } from "./zh";

export type Locale = "zh" | "en";

const TRANSLATIONS: Record<Locale, Translations> = { zh, en };

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored === "zh" || stored === "en") return stored;
  // Default to Chinese
  return "zh";
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  t: zh,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem("locale", loc);
    document.documentElement.lang = loc === "zh" ? "zh-CN" : "en";
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "zh" ? "en" : "zh");
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    t: TRANSLATIONS[locale],
    setLocale,
    toggleLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
