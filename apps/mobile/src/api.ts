import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type AuthResponse = {
  user: { id: string; fullName: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
let accessToken: string | null = null;
const refreshTokenKey = "juris.refreshToken";

async function saveRefreshToken(token: string) {
  if (Platform.OS === "web") localStorage.setItem(refreshTokenKey, token);
  else await SecureStore.setItemAsync(refreshTokenKey, token);
}

async function readRefreshToken() {
  if (Platform.OS === "web") return localStorage.getItem(refreshTokenKey);
  return SecureStore.getItemAsync(refreshTokenKey);
}

async function clearRefreshToken() {
  if (Platform.OS === "web") localStorage.removeItem(refreshTokenKey);
  else await SecureStore.deleteItemAsync(refreshTokenKey);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The request could not be completed");
  return payload.data as T;
}

async function remember(result: AuthResponse) {
  accessToken = result.accessToken;
  await saveRefreshToken(result.refreshToken);
  return result;
}

export async function login(email: string, password: string) {
  const result = await request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return remember(result);
}

export async function register(fullName: string, email: string, password: string) {
  const result = await request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password }) });
  return remember(result);
}

export async function restoreSession() {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) return false;
  try {
    const result = await request<AuthResponse>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) });
    remember(result);
    return true;
  } catch {
    accessToken = null;
    await clearRefreshToken();
    return false;
  }
}

export async function logout() {
  const refreshToken = await readRefreshToken();
  if (refreshToken) await request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
  accessToken = null;
  await clearRefreshToken();
}
