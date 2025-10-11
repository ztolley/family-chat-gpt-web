import { signal, computed } from "@lit-labs/signals";
import {
  clearSession,
  deriveProfile,
  restoreSession,
  saveSession,
} from "@/lib/authHelpers";
import type { AuthBackendProvider, UserProfile } from "@/types";

export const authTokenSignal = signal<string | null>(null);
export const authProfileSignal = signal<UserProfile | null>(null);
export const authProviderSignal = signal<AuthBackendProvider | null>(null);

export const isAuthenticatedSignal = computed(
  () => authTokenSignal.get() !== null,
);

export function setAuthSession(provider: AuthBackendProvider, token: string) {
  const profile = deriveProfile(provider, token);
  authTokenSignal.set(token);
  authProfileSignal.set(profile);
  authProviderSignal.set(provider);
  saveSession(token, profile);
}

export function clearAuthSession() {
  clearSession();
  authTokenSignal.set(null);
  authProfileSignal.set(null);
  authProviderSignal.set(null);
}

export function restoreAuthSession() {
  const restored = restoreSession();
  if (!restored) {
    clearAuthSession();
    return "none" as const;
  }

  const { token, profile, provider, expired } = restored;

  if (!profile || !provider) {
    clearAuthSession();
    return "none" as const;
  }

  if (!expired && token) {
    authTokenSignal.set(token);
    authProfileSignal.set(profile);
    authProviderSignal.set(provider);
    return "restored" as const;
  }

  authTokenSignal.set(null);
  authProfileSignal.set(null);
  authProviderSignal.set(provider);
  return "refresh-needed" as const;
}

// Restore once at module evaluation.
restoreAuthSession();
