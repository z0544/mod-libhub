import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, translations, type Language } from "@/i18n/translations";

const LANG_KEY = "modlibhub_lang";

interface I18nContextValue {
  language: Language;
  dir: "rtl" | "ltr";
  setLanguage: (lang: Language) => void;
  toggle: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(LANG_KEY) as Language | null;
  if (stored === "he" || stored === "en") return stored;
  return "he"; // default Hebrew
}

function dirFor(lang: Language): "rtl" | "ltr" {
  return LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const dir = dirFor(language);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = dir;
    localStorage.setItem(LANG_KEY, language);
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);
  const toggle = useCallback(() => setLanguageState((l) => (l === "he" ? "en" : "he")), []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let value = translations[language][key] ?? translations.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [language]
  );

  const ctx = useMemo<I18nContextValue>(
    () => ({ language, dir, setLanguage, toggle, t }),
    [language, dir, setLanguage, toggle, t]
  );

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
