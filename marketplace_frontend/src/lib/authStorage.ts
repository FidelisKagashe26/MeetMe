// src/lib/authStorage.ts

export interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  date_joined: string;
  is_seller?: boolean;
  preferred_language?: "en" | "sw" | null;
  theme?: "light" | "dark" | "system" | null;
}

export interface AuthData {
  access: string;
  refresh: string;
  user: User;
}

const ACCESS_KEY = "marketplace_access_token";
const REFRESH_KEY = "marketplace_refresh_token";
const USER_KEY = "marketplace_user";

// -------- GLOBAL LISTENERS (AuthContext & wengine wanaweza kusubscribe) --------

type AuthListener = (payload: { user: User | null }) => void;

const listeners = new Set<AuthListener>();

function notifyAuthChange(user: User | null) {
  listeners.forEach((listener) => {
    try {
      listener({ user });
    } catch (err) {
      console.error("Auth listener error:", err);
    }
  });
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------- STORAGE HELPERS ----------------------

export function saveAuthData(data: AuthData): void {
  localStorage.setItem(ACCESS_KEY, data.access);
  localStorage.setItem(REFRESH_KEY, data.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  notifyAuthChange(data.user);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuthData(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange(null);
}
