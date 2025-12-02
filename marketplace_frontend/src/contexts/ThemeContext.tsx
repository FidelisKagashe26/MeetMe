// src/contexts/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  mode: ThemeMode; // chaguo la user (light | dark | auto)
  resolvedTheme: "light" | "dark"; // theme halisi inayotumika sasa
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "app_theme_mode";

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "auto";
};

// Jaribu kusoma system preference (OS) mara moja
const getSystemPreference = (): "light" | "dark" | null => {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    // ignore
  }
  return null;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // IMPORTANT: tumia callback hapa ili getInitialMode iitwe mara moja tu
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode());

  const resolvedTheme = useMemo<"light" | "dark">(() => {
    // kama user amechagua moja kwa moja
    if (mode === "light" || mode === "dark") return mode;

    // mode === "auto" => tumia system preference kama ipo
    const sys = getSystemPreference();
    if (sys) return sys;

    // fallback time-of-day
    const hour = new Date().getHours();
    const isDayTime = hour >= 7 && hour < 19;
    return isDayTime ? "light" : "dark";
  }, [mode]);

  // Apply theme kwenye <html> + hifadhi mode kwenye localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme-mode", mode);
    root.setAttribute("data-theme-resolved", resolvedTheme);

    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode, resolvedTheme]);

  const value: ThemeContextValue = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme]
  );

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
