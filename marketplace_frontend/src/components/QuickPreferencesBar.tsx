// src/components/QuickPreferencesBar.tsx
import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const QuickPreferencesBar: React.FC = () => {
  const { mode, setMode } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isDark = mode === "dark";

  return (
    <div className="w-full flex items-center justify-end gap-2 px-3 py-1.5 text-[11px] bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/70 dark:border-slate-800/70">
      {/* Language toggle */}
      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 px-1 py-0.5">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`px-2 py-0.5 rounded-full font-medium ${
            language === "en"
              ? "bg-orange-500 text-white"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("sw")}
          className={`px-2 py-0.5 rounded-full font-medium ${
            language === "sw"
              ? "bg-orange-500 text-white"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          SW
        </button>
      </div>

      {/* Theme toggle: light / auto / dark */}
      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 px-1 py-0.5">
        <button
          type="button"
          title="Light"
          onClick={() => setMode("light")}
          className={`px-2 py-0.5 rounded-full ${
            mode === "light"
              ? "bg-orange-500 text-white"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          ☀
        </button>
        <button
          type="button"
          title="Auto (Day/Night)"
          onClick={() => setMode("auto")}
          className={`px-2 py-0.5 rounded-full ${
            mode === "auto"
              ? "bg-orange-500 text-white"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          A
        </button>
        <button
          type="button"
          title="Dark"
          onClick={() => setMode("dark")}
          className={`px-2 py-0.5 rounded-full ${
            mode === "dark"
              ? "bg-orange-500 text-white"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {isDark ? "🌙" : "🌘"}
        </button>
      </div>
    </div>
  );
};

export default QuickPreferencesBar;
