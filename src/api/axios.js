
// --- FILE: src/api/axios.js ---
import axios from "axios";
import { message } from "antd";

// ==========================
// 🔑 Token Helpers
// ==========================
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const setRefreshToken = (refreshToken) =>
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

export const removeAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// ==========================
// 🌍 Axios Instance
// ==========================
// ✅ Use environment variable for baseURL
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api" || "https://backend.hahu-aluminium.com/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ==========================
// 📡 Request Interceptor
// ==========================
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================
// ⚠️ Response Interceptor
// ==========================
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // 🔄 Handle 401 (Unauthorized) with token refresh
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL || "https://backend.hahu-aluminium.com/api"}/auth/refresh`,
            { token: refreshToken }
          );

          const newToken = res.data?.token;
          if (!newToken) throw new Error("No token returned from refresh");

          setToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          return instance(originalRequest); // ✅ Retry original request
        } else {
          throw new Error("No refresh token available");
        }
      } catch (refreshError) {
        removeAuth();
        message.error("Session expired. Please log in again.");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // 🛑 Global error handling
    if (status >= 500) {
      message.error("⚠️ Server error, please try again later.");
    } else if (status >= 400) {
      message.error(error.response?.data?.error || "❌ Request failed.");
    }

    return Promise.reject(error);
  }
);

// ==========================
// 📦 Convenience Methods
// ==========================
export const api = {
  get: (url, config = {}) => instance.get(url, config),
  post: (url, data, config = {}) => instance.post(url, data, config),
  put: (url, data, config = {}) => instance.put(url, data, config),
  delete: (url, config = {}) => instance.delete(url, config),
};

export default instance;
