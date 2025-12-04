// src/contexts/ThemeContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ThemeMode } from "../types/theme";
import { THEME_STORAGE_KEY } from "../constants/theme";

interface ThemeContextValue {
  mode: ThemeMode; // "light" | "dark" | "auto"
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(
    THEME_STORAGE_KEY,
  ) as ThemeMode | null;

  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }

  // default: AUTO => mchana light, usiku dark
  return "auto";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode());

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Hifadhi preference ya user kwenye localStorage
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);

    let intervalId: number | undefined;

    const applyTheme = () => {
      let effective: "light" | "dark" = "light";

      if (mode === "light") {
        effective = "light";
      } else if (mode === "dark") {
        effective = "dark";
      } else {
        // AUTO: mchana 07:00–18:59 => light, usiku => dark
        const hour = new Date().getHours();
        effective = hour >= 7 && hour < 19 ? "light" : "dark";
      }

      if (effective === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    };

    // Apply mara moja
    applyTheme();

    // Kama mode ni "auto", check tena kila dakika 5 ili kubadilika kati ya mchana/usiku
    if (mode === "auto") {
      intervalId = window.setInterval(applyTheme, 5 * 60 * 1000);
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [mode]);

  const value: ThemeContextValue = {
    mode,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
