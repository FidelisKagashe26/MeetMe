// src/types/theme.ts

// Mode inayotumiwa na frontend (ThemeContext + UI)
// "auto" = SYSTEM mode (mchana light, usiku dark)
export type ThemeMode = "light" | "dark" | "auto";

// Mode inayotumiwa na backend (DRF /api/auth/settings/)
export type BackendTheme = "light" | "dark" | "system";

// Kutoka backend (DB) kwenda frontend
export function mapBackendThemeToMode(
  theme: BackendTheme | null | undefined,
): ThemeMode {
  if (!theme || theme === "system") {
    // "system" frontend side = "auto" (mchana light, usiku dark)
    return "auto";
  }
  return theme;
}

// Kutoka frontend mode kwenda backend (tunapost /api/auth/settings/)
export function mapThemeModeToBackend(mode: ThemeMode): BackendTheme {
  if (mode === "light" || mode === "dark") return mode;
  // "auto" (SYSTEM kwenye UI) → "system" kwa backend
  return "system";
}
