// src/lib/apiClient.ts
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveAuthData,
  clearAuthData,
  getUser,
} from "./authStorage";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
});

// Attach Authorization header automatically
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto refresh token on 401 (if refresh token available)
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
      prom.resolve(token || "");
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // kama si 401 au tayari tumejaribu refresh, rudi error
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      !getRefreshToken()
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // subcribe kwenye queue hadi refresh imalizike
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers && typeof token === "string") {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch(Promise.reject);
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/auth/jwt/refresh/`,
        { refresh: refreshToken }
      );

      const newAccess = response.data.access as string;
      const user = getUser();

      if (!user) {
        // hatuna user, basi toka tu
        clearAuthData();
        processQueue(null, null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      saveAuthData({
        access: newAccess,
        refresh: refreshToken || "",
        user,
      });

      processQueue(null, newAccess);
      isRefreshing = false;

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthData();
      processQueue(refreshError, null);
      isRefreshing = false;
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
