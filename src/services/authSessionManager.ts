import { signal } from "@lit-labs/signals";
import { effect } from "@/lib/signalHelpers";
import { decodeJwt, fetchConfig, isTokenExpired } from "@/lib/authHelpers";
import { fetchGoogleCredential } from "@/lib/googleIdentity";
import {
  authProviderSignal,
  authTokenSignal,
  clearAuthSession,
  setAuthSession,
} from "./authProvider";
import type { AuthBackendProvider } from "@/types";

const REFRESH_LEAD_MS = 2 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;

export const googleClientIdSignal = signal<string | null>(null);
export const googleConfigErrorSignal = signal<string | null>(null);

let configPromise: Promise<void> | null = null;
let refreshTimer: number | null = null;
let refreshing = false;
let watchersStarted = false;

async function loadConfigInternal() {
  try {
    const config = await fetchConfig();
    const clientId = config.googleClientId ?? null;
    googleClientIdSignal.set(clientId);
    googleConfigErrorSignal.set(
      clientId ? null : "Google Sign-In is not configured.",
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load configuration.";
    googleClientIdSignal.set(null);
    googleConfigErrorSignal.set(message);
  }
}

export async function ensureGoogleConfigLoaded() {
  if (!configPromise) {
    configPromise = loadConfigInternal().finally(() => {
      configPromise = null;
    });
  }
  await configPromise;
}

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

async function refreshGoogleToken() {
  await ensureGoogleConfigLoaded();
  const clientId = googleClientIdSignal.get();

  if (!clientId) {
    throw new Error("Google Sign-In is not configured.");
  }

  const token = await fetchGoogleCredential(clientId, {
    autoSelect: true,
  });

  setAuthSession("google", token);
}

async function refreshAuthToken(provider: AuthBackendProvider | null) {
  if (refreshing || !provider) {
    return;
  }

  refreshing = true;
  try {
    if (provider === "google") {
      await refreshGoogleToken();
    }
  } catch (error) {
    console.error(error);
    clearAuthSession();
  } finally {
    refreshing = false;
  }
}

function scheduleTokenRefresh(
  token: string | null,
  provider: AuthBackendProvider | null,
) {
  clearRefreshTimer();

  if (!token || provider !== "google") {
    return;
  }

  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") {
    console.warn("Unable to schedule token refresh: missing expiration.");
    return;
  }

  if (isTokenExpired(payload)) {
    void refreshAuthToken(provider);
    return;
  }

  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  const triggerAt = expiresAt - REFRESH_LEAD_MS;

  if (triggerAt <= now) {
    void refreshAuthToken(provider);
    return;
  }

  const delay = Math.max(triggerAt - now, MIN_REFRESH_DELAY_MS);
  const scheduledToken = token;

  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    if (authTokenSignal.get() !== scheduledToken) {
      return;
    }
    void refreshAuthToken(provider);
  }, delay);
}

function startAuthWatchers() {
  if (watchersStarted) {
    return;
  }
  watchersStarted = true;

  effect(() => {
    const token = authTokenSignal.get();
    const provider = authProviderSignal.get();

    scheduleTokenRefresh(token, provider);

    if (!token && provider === "google") {
      void refreshAuthToken(provider);
    }
  });
}

startAuthWatchers();
