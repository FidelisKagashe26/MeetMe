// src/contexts/LanguageContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type LanguageCode = "en" | "sw";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const LANGUAGE_STORAGE_KEY = "app_language";

// translations ndogo za kuanzia – unaweza kupanua baadaye
const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    "general.loading": "Loading...",
    "general.theme.light": "Light",
    "general.theme.dark": "Dark",
    "general.theme.auto": "Auto",
    "general.language.en": "English",
    "general.language.sw": "Swahili",
  },
  sw: {
    "general.loading": "Inapakia...",
    "general.theme.light": "Mwanga",
    "general.theme.dark": "Giza",
    "general.theme.auto": "Otomatiki",
    "general.language.en": "Kiingereza",
    "general.language.sw": "Kiswahili",
  },
};

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "sw") return stored;
  return "en";
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<LanguageCode>(
    getInitialLanguage
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    window.document.documentElement.setAttribute("lang", language);
  }, [language]);

  const t = useMemo(
    () => (key: string) => {
      const dict = translations[language] || {};
      return dict[key] || key;
    },
    [language]
  );

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};
