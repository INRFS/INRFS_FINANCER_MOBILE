import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/environment";

const ACCESS_KEY = "inrfs_access_token";
const REFRESH_KEY = "inrfs_refresh_token";
let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let sessionExpired: (() => void) | null = null;

export type AuthUser = { id: string; email?: string; mobile?: string; fullName?: string; firstName?: string; lastName?: string; businessName?: string; financerId?: string | null; roles?: string[] };
export type TokenResponse = { accessToken: string; refreshToken: string; expiresAt: string; user: AuthUser };

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string[]>, public traceId?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const tokenStore = {
  async restore() {
    [accessToken, refreshToken] = await Promise.all([SecureStore.getItemAsync(ACCESS_KEY), SecureStore.getItemAsync(REFRESH_KEY)]);
  },
  async save(tokens: TokenResponse) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    await Promise.all([SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken), SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken)]);
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  },
  access: () => accessToken,
  refresh: () => refreshToken,
  onExpired(callback: () => void) { sessionExpired = callback; },
};

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const validationMessage = payload?.errors && Object.values(payload.errors as Record<string, string[]>).flat().find(Boolean);
    throw new ApiError(payload?.message || validationMessage || payload?.title || `Request failed (${response.status})`, response.status, payload?.errors, payload?.traceId);
  }
  return payload?.data ?? payload;
}

async function refreshSession() {
  if (!refreshToken) throw new ApiError("Your session has expired. Please sign in again.", 401);
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }),
    }).then(parseResponse).then(async (tokens: TokenResponse) => { await tokenStore.save(tokens); return tokens.accessToken; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

type RequestOptions = RequestInit & { auth?: boolean; retryAuth?: boolean };
export async function apiRequest(path: string, options: RequestOptions = {}): Promise<any> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken && options.auth !== false) headers.set("Authorization", `Bearer ${accessToken}`);
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401 && options.auth !== false && options.retryAuth !== false) {
    try {
      headers.set("Authorization", `Bearer ${await refreshSession()}`);
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      await tokenStore.clear(); sessionExpired?.(); throw error;
    }
  }
  return parseResponse(response);
}

export const api = {
  get: (path: string, options?: RequestOptions) => apiRequest(path, { ...options, method: "GET" }),
  post: (path: string, data: unknown, options?: RequestOptions) => apiRequest(path, { ...options, method: "POST", body: data instanceof FormData ? data : JSON.stringify(data) }),
  put: (path: string, data: unknown, options?: RequestOptions) => apiRequest(path, { ...options, method: "PUT", body: JSON.stringify(data) }),
  delete: (path: string, options?: RequestOptions) => apiRequest(path, { ...options, method: "DELETE" }),
};

