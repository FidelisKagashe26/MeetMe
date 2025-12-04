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
    startGlobalLoading();

    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization =
        `Bearer ${token}`;
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

    const originalRequest = error.config as
      | ExtendedAxiosRequestConfig
      | undefined;
    const response = error.response;

    if (!originalRequest || !response) {
      return Promise.reject(error);
    }

    const status = response.status;
    const isRefreshEndpoint =
      originalRequest.url?.includes("/api/auth/jwt/refresh/") ?? false;

    // Sio 401, au tayari tumejaribu, au hakuna refresh token,
    // au ni request yenyewe ya /jwt/refresh/ => usijaribu tena, rudisha error tu.
    if (
      status !== 401 ||
      originalRequest._retry ||
      !getRefreshToken() ||
      isRefreshEndpoint
    ) {
      return Promise.reject(error);
    }

    // Kama kuna process ya refresh inaendelea, weka request kwenye foleni
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
            (originalRequest.headers as Record<string, string>)
              .Authorization = `Bearer ${token}`;
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
      if (!refreshToken) {
        clearAuthData();
        processQueue(null, null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      // Tumia axios plain ili tusipigwe tena na interceptor
      const refreshResponse = await axios.post<{
        access: string;
        refresh?: string;
      }>(`${baseURL}/api/auth/jwt/refresh/`, {
        refresh: refreshToken,
      });

      const { access: newAccess, refresh: maybeNewRefresh } =
        refreshResponse.data;

      if (!newAccess) {
        clearAuthData();
        processQueue(
          new Error("No access token in refresh response"),
          null,
        );
        isRefreshing = false;
        return Promise.reject(error);
      }

      const user = getUser();
      if (!user) {
        clearAuthData();
        processQueue(null, null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      const newAuth: AuthData = {
        access: newAccess,
        // Kama backend anarotate refresh token, tunaiheshimu; vinginevyo tumia ya zamani
        refresh: maybeNewRefresh ?? refreshToken,
        user,
      };

      // Hifadhi access mpya (na ku-notify listeners – AuthContext n.k.)
      saveAuthData(newAuth);

      // Rudisha token mpya kwa waliokuwa kwenye foleni
      processQueue(null, newAccess);
      isRefreshing = false;

      originalRequest.headers = originalRequest.headers ?? {};
      (originalRequest.headers as Record<string, string>).Authorization =
        `Bearer ${newAccess}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh imeshindikana: safisha auth, notify na rudisha error
      clearAuthData();
      processQueue(refreshError, null);
      isRefreshing = false;
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
