import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "izitailleur.accessToken";
const REFRESH_TOKEN_KEY = "izitailleur.refreshToken";

// En développement, l'émulateur Android résout localhost de l'hôte via 10.0.2.2.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new ApiError(response.status, message ?? "Une erreur est survenue");
  }

  return body as T;
}

async function tryRefreshTokens(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const tokens = await response.json();
    await storeTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

export async function storeTokens(tokens: { accessToken: string; refreshToken: string }) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function hasStoredSession(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  return Boolean(token);
}

export const apiClient = {
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
};
