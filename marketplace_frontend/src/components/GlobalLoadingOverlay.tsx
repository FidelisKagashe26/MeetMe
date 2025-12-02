// src/components/GlobalLoadingOverlay.tsx
import React from "react";
import { useUISettings } from "../contexts/UISettingsContext";
import { useLanguage } from "../contexts/LanguageContext";

const GlobalLoadingOverlay: React.FC = () => {
  const { isGlobalLoading } = useUISettings();
  const { t } = useLanguage();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Orange spinner */}
        <div className="w-14 h-14 rounded-full border-[3px] border-orange-400 border-t-transparent animate-spin shadow-lg bg-linear-to-br from-orange-400 via-orange-500 to-orange-600" />
        <p className="text-sm font-medium text-white drop-shadow">
          {t("general.loading")}
        </p>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
