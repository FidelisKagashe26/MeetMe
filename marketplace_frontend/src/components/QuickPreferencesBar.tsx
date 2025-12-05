// src/components/QuickPreferencesBar.tsx
import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const QuickPreferencesBar: React.FC = () => {
  const { mode, setMode } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isDark = mode === "dark";

  const chipBase =
    "inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 px-1 py-0.5";
  const pillBase =
    "px-2 py-0.5 rounded-full font-medium transition-colors";
  const pillActive = "bg-orange-500 text-white";
  const pillInactive = "text-slate-600 dark:text-slate-300";

  return (
    <div className="w-full flex items-center justify-end gap-2 px-3 py-1.5 text-[11px] bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/70 dark:border-slate-800/70">
      {/* Language toggle */}
      <div className={chipBase} role="group" aria-label="Language">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          className={`${pillBase} ${
            language === "en" ? pillActive : pillInactive
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("sw")}
          aria-pressed={language === "sw"}
          className={`${pillBase} ${
            language === "sw" ? pillActive : pillInactive
          }`}
        >
          SW
        </button>
      </div>

      {/* Theme toggle: light / auto / dark */}
      <div className={chipBase} role="group" aria-label="Theme">
        <button
          type="button"
          title="Light"
          aria-pressed={mode === "light"}
          onClick={() => setMode("light")}
          className={`${pillBase} ${
            mode === "light" ? pillActive : pillInactive
          }`}
        >
          ☀
        </button>
        <button
          type="button"
          title="Auto (Day/Night)"
          aria-pressed={mode === "auto"}
          onClick={() => setMode("auto")}
          className={`${pillBase} ${
            mode === "auto" ? pillActive : pillInactive
          }`}
        >
          A
        </button>
        <button
          type="button"
          title="Dark"
          aria-pressed={mode === "dark"}
          onClick={() => setMode("dark")}
          className={`${pillBase} ${
            mode === "dark" ? pillActive : pillInactive
          }`}
        >
          {isDark ? "🌙" : "🌘"}
        </button>
      </div>
    </div>
  );
};

export default QuickPreferencesBar;
