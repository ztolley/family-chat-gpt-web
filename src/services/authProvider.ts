import { signal, computed, batch } from "@preact/signals-core";
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
  () => authTokenSignal.value !== null,
);

export function setAuthSession(provider: AuthBackendProvider, token: string) {
  const profile = deriveProfile(provider, token);
  batch(() => {
    authTokenSignal.value = token;
    authProfileSignal.value = profile;
    authProviderSignal.value = provider;
  });
  saveSession(token, profile);
}

export function clearAuthSession() {
  clearSession();
  batch(() => {
    authTokenSignal.value = null;
    authProfileSignal.value = null;
    authProviderSignal.value = null;
  });
}

export function restoreAuthSession() {
  const restored = restoreSession();
  if (restored) {
    batch(() => {
      const provider = restored.profile.provider as AuthBackendProvider;
      authTokenSignal.value = restored.token;
      authProfileSignal.value = restored.profile;
      authProviderSignal.value = provider;
    });
    return true;
  }
  clearAuthSession();
  return false;
}

// Restore once at module evaluation.
restoreAuthSession();
