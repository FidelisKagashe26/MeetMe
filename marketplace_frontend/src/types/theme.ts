// src/types/theme.ts
export type ThemeMode = "light" | "dark" | "auto";
export type BackendTheme = "light" | "dark" | "system";

// Frontend "auto" maps to Backend "system"
export const mapBackendThemeToMode = (value: BackendTheme | undefined | null): ThemeMode => {
  if (!value) return "auto";
  if (value === "light") return "light";
  if (value === "dark") return "dark";
  return "auto"; // "system" => "auto"
};

// Frontend "auto" maps to Backend "system"
export const mapThemeModeToBackend = (mode: ThemeMode): BackendTheme => {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return "system"; // "auto" => "system"
};