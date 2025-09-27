import type {
  AuthBackendProvider,
  ConfigResponse,
  JWTPayload,
  UserProfile,
} from "@/types";

export const TOKEN_STORAGE_KEY = "familychat_token";
export const PROFILE_STORAGE_KEY = "familychat_profile";

export async function fetchConfig(): Promise<ConfigResponse> {
  const response = await fetch(`/config`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return (await response.json()) as ConfigResponse;
}

export function decodeJwt(token: string): JWTPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json) as JWTPayload;
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

export function deriveProfile(
  provider: AuthBackendProvider,
  token: string,
): UserProfile {
  const payload = decodeJwt(token) ?? {};
  return {
    provider,
    email: payload.email,
    name: payload.name,
  };
}

export function saveSession(token: string, profile: UserProfile) {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors; session persistence is best-effort.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function restoreSession(): {
  token: string;
  profile: UserProfile;
} | null {
  let storedToken: string | null;
  try {
    storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    storedToken = null;
  }

  if (!storedToken) {
    return null;
  }

  const payload = decodeJwt(storedToken);
  if (isTokenExpired(payload)) {
    clearSession();
    return null;
  }

  let storedProfile: UserProfile | null = null;
  try {
    const rawProfile = sessionStorage.getItem(PROFILE_STORAGE_KEY);
    storedProfile = rawProfile ? (JSON.parse(rawProfile) as UserProfile) : null;
  } catch {
    storedProfile = null;
  }

  if (storedProfile) {
    return { token: storedToken, profile: storedProfile };
  }

  const provider = (
    payload?.iss?.includes("apple") ? "apple" : "google"
  ) as AuthBackendProvider;
  const profile = {
    provider,
    email: payload?.email,
    name: payload?.name,
  };
  return { token: storedToken, profile };
}
