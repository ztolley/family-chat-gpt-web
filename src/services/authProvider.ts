/**
 * Lightweight state container for authentication data.
 *
 * This module focuses purely on in-memory and persisted state (ID token,
 * profile, refresh token) using @lit-labs/signals. It intentionally stays free
 * of network concerns—the actual refresh/exchange logic lives in
 * authSessionManager.ts so tests and consumers can reason about state changes
 * without crossing into async flows.
 */
import { signal, computed } from "@lit-labs/signals";
import {
  clearSession,
  deriveProfile,
  restoreSession,
  saveSession,
} from "@/lib/authHelpers";
import type { UserProfile } from "@/types";

// Signals capture the current ID token, profile, and refresh token in-memory.
export const authTokenSignal = signal<string | null>(null);
export const authProfileSignal = signal<UserProfile | null>(null);
export const authRefreshTokenSignal = signal<string | null>(null);

// Derived convenience signal used by the UI for simple auth checks.
export const isAuthenticatedSignal = computed(
  () => authTokenSignal.get() !== null,
);

// setAuthSession updates the reactive state and persists the token bundle.
export function setAuthSession(token: string, refreshToken?: string | null) {
  const profile = deriveProfile(token);
  authTokenSignal.set(token);
  authProfileSignal.set(profile);
  const nextRefreshToken = refreshToken ?? authRefreshTokenSignal.get() ?? null;
  authRefreshTokenSignal.set(nextRefreshToken);
  saveSession(token, profile, nextRefreshToken);
}

// clearAuthSession wipes both the in-memory signals and localStorage.
export function clearAuthSession() {
  clearSession();
  authTokenSignal.set(null);
  authProfileSignal.set(null);
  authRefreshTokenSignal.set(null);
}

// restoreAuthSession reloads any prior session state from storage. It feeds the
// signals so the rest of the app rehydrates correctly.
export function restoreAuthSession() {
  const restored = restoreSession();
  if (!restored) {
    clearAuthSession();
    return "none" as const;
  }

  const { token, profile, expired, refreshToken } = restored;

  authProfileSignal.set(profile);
  authRefreshTokenSignal.set(refreshToken);

  if (!expired && token) {
    authTokenSignal.set(token);
    return "restored" as const;
  }

  authTokenSignal.set(null);
  return "refresh-needed" as const;
}

// Bootstrap the signals on module load so initial renders see any persisted session.
restoreAuthSession();
