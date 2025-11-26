// src/lib/authStorage.ts

export interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface AuthData {
  access: string;
  refresh: string;
  user: User;
}

const ACCESS_KEY = "marketplace_access_token";
const REFRESH_KEY = "marketplace_refresh_token";
const USER_KEY = "marketplace_user";

export function saveAuthData(data: AuthData) {
  localStorage.setItem(ACCESS_KEY, data.access);
  localStorage.setItem(REFRESH_KEY, data.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
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

export function clearAuthData() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
