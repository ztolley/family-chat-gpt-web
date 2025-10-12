import { signal, computed } from "@lit-labs/signals";
import {
  clearSession,
  deriveProfile,
  restoreSession,
  saveSession,
} from "@/lib/authHelpers";
import type { UserProfile } from "@/types";

export const authTokenSignal = signal<string | null>(null);
export const authProfileSignal = signal<UserProfile | null>(null);

export const isAuthenticatedSignal = computed(
  () => authTokenSignal.get() !== null,
);

export function setAuthSession(token: string) {
  const profile = deriveProfile(token);
  authTokenSignal.set(token);
  authProfileSignal.set(profile);
  saveSession(token, profile);
}

export function clearAuthSession() {
  clearSession();
  authTokenSignal.set(null);
  authProfileSignal.set(null);
}

export function restoreAuthSession() {
  const restored = restoreSession();
  if (!restored) {
    clearAuthSession();
    return "none" as const;
  }

  const { token, profile, expired } = restored;

  authProfileSignal.set(profile);

  if (!expired && token) {
    authTokenSignal.set(token);
    return "restored" as const;
  }

  authTokenSignal.set(null);
  return "refresh-needed" as const;
}

// Restore once at module evaluation.
restoreAuthSession();
