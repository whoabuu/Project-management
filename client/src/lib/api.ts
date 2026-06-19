import axios from 'axios';
import type {
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
} from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
const TOKEN_KEY   = 'nexus_token';
const REFRESH_KEY = 'nexus_refresh_token';

// ── Axios Instance ────────────────────────────────────────────────────────────

/**
 * Central Axios instance used by every feature module.
 * All requests are relative to BASE_URL.
 * withCredentials ensures cookies are sent for future session support.
 */
export const api = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,
  timeout:         15_000, // 15s — avoids hanging requests silently
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// ── Token Helpers ─────────────────────────────────────────────────────────────

/**
 * Safely reads a value from localStorage.
 * Returns null if localStorage is unavailable (e.g. private browsing).
 */
const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Safely removes items from localStorage without throwing.
 */
const clearAuthTokens = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Swallow silently — we still redirect regardless
  }
};

export const tokenStorage = {
  getAccessToken:  ()            => getStorageItem(TOKEN_KEY),
  getRefreshToken: ()            => getStorageItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY,   access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      console.warn('[Nexus] Could not persist auth tokens to localStorage.');
    }
  },
  clear: clearAuthTokens,
};

// ── API Response Types ────────────────────────────────────────────────────────

/**
 * Mirrors the ApiSuccessResponse<T> shape from our backend's apiResponse.ts.
 * Every successful response envelope matches this structure.
 */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data:    T;
  meta?:   Record<string, unknown>;
}

/**
 * Mirrors the ApiErrorResponse shape from our backend.
 */
export interface ApiError {
  success: false;
  error:   string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;



// ── Request Interceptor ───────────────────────────────────────────────────────

/**
 * Attaches the Bearer token to every outgoing request if one exists.
 * Runs before each request leaves the browser.
 */
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    console.error('[Nexus API] Request setup error:', error.message);
    return Promise.reject(error);
  }
);

// ── Refresh Token State ───────────────────────────────────────────────────────

/**
 * Tracks whether a token refresh is already in-flight.
 * Prevents multiple simultaneous refresh calls when several
 * requests 401 at the same time.
 */
let isRefreshing           = false;
let refreshSubscribers:    Array<(token: string) => void> = [];

const subscribeToRefresh = (cb: (token: string) => void): void => {
  refreshSubscribers.push(cb);
};

const notifyRefreshSubscribers = (newToken: string): void => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

// ── Response Interceptor ──────────────────────────────────────────────────────

/**
 * Global response error handler.
 *
 * 401 flow:
 *   1. First 401 → attempt silent refresh using the refresh token.
 *   2. If refresh succeeds → retry the original request with the new token.
 *   3. If refresh fails   → clear tokens and redirect to /login.
 *
 * Subsequent 401s during the refresh attempt are queued and replayed
 * once the refresh resolves, preventing a "token refresh storm".
 */

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,

  async (error: AxiosError<ApiError>): Promise<AxiosResponse> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── 401 Unauthorized ─────────────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefreshToken();

      // No refresh token available — force logout immediately
      if (!refreshToken) {
        clearAuthTokens();
        redirectToLogin();
        return Promise.reject(error);
      }

      // Another refresh is already running — queue this request
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          subscribeToRefresh((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          });
          // Safety timeout — if refresh never resolves, reject after 10s
          setTimeout(() => reject(error), 10_000);
        });
      }

      // Mark this request as the refresh attempt to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing            = true;

      try {
        // Attempt to exchange refresh token for a new access token
        const { data } = await axios.post<ApiSuccess<{
          accessToken:  string;
          refreshToken: string;
        }>>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken } = data.data;

        tokenStorage.setTokens(accessToken, newRefreshToken);

        // Patch the original request and notify queued requests
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        notifyRefreshSubscribers(accessToken);

        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed — clear everything and go to login
        clearAuthTokens();
        notifyRefreshSubscribers(''); // Unblock queued requests (they will also fail)
        redirectToLogin();
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 Forbidden ─────────────────────────────────────────────────────────
    if (error.response?.status === 403) {
      console.warn(
        '[Nexus API] 403 Forbidden — insufficient permissions for:',
        originalRequest.url
      );
    }

    // ── 500+ Server Error ─────────────────────────────────────────────────────
    if (error.response && error.response.status >= 500) {
      console.error(
        '[Nexus API] Server error:',
        error.response.data?.error ?? 'Unknown server error'
      );
    }

    // ── Network / timeout error ───────────────────────────────────────────────
    if (!error.response) {
      console.error(
        '[Nexus API] Network error — server may be unreachable:',
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// ── Redirect Helper ───────────────────────────────────────────────────────────

/**
 * Redirects to the login page.
 * Uses window.location rather than React Router's navigate() because
 * this interceptor lives outside React's component tree.
 * The `?session=expired` param lets the login page show a helpful message.
 */
const redirectToLogin = (): void => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?session=expired';
  }
};

// ── Typed Request Helpers ─────────────────────────────────────────────────────

/**
 * Convenience wrappers that unwrap the Axios response and return
 * the raw ApiSuccess<T> envelope directly. Use these in service files
 * instead of calling `api.get(...).then(r => r.data)` everywhere.
 *
 * Usage:
 *   const result = await apiGet<{ user: IUser }>('/auth/me');
 *   console.log(result.data.user);
 */

export const apiGet = async <T>(
  url:     string,
  params?: Record<string, unknown>
): Promise<ApiSuccess<T>> => {
  const response = await api.get<ApiSuccess<T>>(url, { params });
  return response.data;
};

export const apiPost = async <T>(
  url:  string,
  body?: unknown
): Promise<ApiSuccess<T>> => {
  const response = await api.post<ApiSuccess<T>>(url, body);
  return response.data;
};

export const apiPatch = async <T>(
  url:  string,
  body?: unknown
): Promise<ApiSuccess<T>> => {
  const response = await api.patch<ApiSuccess<T>>(url, body);
  return response.data;
};

export const apiDelete = async <T>(
  url: string
): Promise<ApiSuccess<T>> => {
  const response = await api.delete<ApiSuccess<T>>(url);
  return response.data;
};

export default api;