// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import type { AuthData, User } from "../lib/authStorage";
import {
  saveAuthData,
  getUser,
  clearAuthData,
  getRefreshToken,
} from "../lib/authStorage";

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  username: string;
  email?: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // initial load from localStorage
  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (data: LoginPayload) => {
    const res = await apiClient.post<AuthData>("/api/auth/login/", data);
    saveAuthData(res.data);
    setUser(res.data.user);
  };

  const register = async (data: RegisterPayload) => {
    const res = await apiClient.post<AuthData>("/api/auth/register/", data);
    saveAuthData(res.data);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      const refresh = getRefreshToken();
      if (refresh) {
        await apiClient.post("/api/auth/logout/", { refresh });
      }
    } catch (err) {
      // hata kama logout imefail server, tutaclear client anyway
      console.error("Logout error", err);
    } finally {
      clearAuthData();
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
