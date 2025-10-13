import { jwtDecode } from "jwt-decode";

import type { ConfigResponse, JWTPayload, UserProfile } from "@/types";

export const TOKEN_STORAGE_KEY = "familychat_token";
export const PROFILE_STORAGE_KEY = "familychat_profile";
export const REFRESH_TOKEN_STORAGE_KEY = "familychat_refresh_token";

export async function fetchConfig(): Promise<ConfigResponse> {
  const response = await fetch(`/config`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return (await response.json()) as ConfigResponse;
}

export function decodeJwt(token: string): JWTPayload | null {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: JWTPayload | null): boolean {
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds;
}

export function deriveProfile(token: string): UserProfile {
  const payload = decodeJwt(token) ?? {};
  return {
    provider: "google",
    subject: payload.sub,
    email: payload.email,
    name: payload.name,
    pictureUrl: payload.picture,
  };
}

export function saveSession(
  token: string,
  profile: UserProfile,
  refreshToken?: string | null,
) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors; session persistence is best-effort.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function restoreSession(): {
  token: string | null;
  profile: UserProfile;
  expired: boolean;
  refreshToken: string | null;
} | null {
  let storedToken: string | null;
  try {
    storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    storedToken = null;
  }

  if (!storedToken) {
    return null;
  }

  const payload = decodeJwt(storedToken);
  const expired = isTokenExpired(payload);

  let storedProfile: UserProfile | null = null;
  try {
    const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    storedProfile = rawProfile ? (JSON.parse(rawProfile) as UserProfile) : null;
  } catch {
    storedProfile = null;
  }

  const profile = storedProfile
    ? { ...storedProfile, provider: "google" }
    : {
        provider: "google",
        email: payload?.email,
        name: payload?.name,
      };

  let refreshToken: string | null = null;
  try {
    refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    refreshToken = null;
  }

  return {
    token: expired ? null : storedToken,
    profile,
    expired,
    refreshToken,
  };
}
