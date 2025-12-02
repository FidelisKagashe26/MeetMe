// src/lib/apiClient.ts

import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import {
  getAccessToken,
  getRefreshToken,
  saveAuthData,
  clearAuthData,
  getUser,
  type AuthData,
} from "./authStorage";
import { startGlobalLoading, stopGlobalLoading } from "./loadingBus";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL,
});

// =================== REQUEST INTERCEPTOR ===================
apiClient.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    // washa global loader
    startGlobalLoading();

    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => {
    stopGlobalLoading();
    return Promise.reject(error);
  },
);

// =================== REFRESH TOKEN HELPERS ===================

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token ?? "");
    }
  });
  failedQueue = [];
}

// =================== RESPONSE INTERCEPTOR ===================

apiClient.interceptors.response.use(
  (response) => {
    stopGlobalLoading();
    return response;
  },
  async (error: AxiosError) => {
    stopGlobalLoading();

    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    // sio 401, au tayari tumeshajaribu refresh, au hakuna refresh token => rudi error kama ilivyo
    if (status !== 401 || originalRequest._retry || !getRefreshToken()) {
      return Promise.reject(error);
    }

    // kama kuna process ya refresh inaendelea, weka kwenye foleni
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (
            originalRequest.headers &&
            typeof token === "string" &&
            token.trim()
          ) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    // Anza mzunguko mpya wa refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();

      const refreshResponse = await axios.post(
        `${baseURL}/api/auth/jwt/refresh/`,
        { refresh: refreshToken },
      );

      const data = refreshResponse.data as { access: string };
      const newAccess = data.access;
      const user = getUser();

      if (!user) {
        // hatuna user kwenye storage – safisha kila kitu
        clearAuthData();
        processQueue(null, null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      const newAuth: AuthData = {
        access: newAccess,
        refresh: refreshToken ?? "",
        user,
      };

      // hifadhi access mpya (na kuwajulisha listeners – AuthContext n.k.)
      saveAuthData(newAuth);

      // rudisha token mpya kwa zilizo-subscribe kwenye foleni
      processQueue(null, newAccess);
      isRefreshing = false;

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      // refresh imeshindikana: clear auth, notify, na toa error
      clearAuthData();
      processQueue(refreshError, null);
      isRefreshing = false;
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
