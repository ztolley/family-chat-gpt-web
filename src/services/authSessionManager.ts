import { signal } from "@lit-labs/signals";
import { effect } from "@/lib/signalHelpers";
import { decodeJwt, fetchConfig, isTokenExpired } from "@/lib/authHelpers";
import { fetchGoogleCredential } from "@/lib/googleIdentity";
import {
  authProfileSignal,
  authTokenSignal,
  clearAuthSession,
  setAuthSession,
} from "./authProvider";

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

  setAuthSession(token);
}

async function refreshAuthToken() {
  if (refreshing) {
    return;
  }

  refreshing = true;
  try {
    await refreshGoogleToken();
  } catch (error) {
    console.error(error);
    clearAuthSession();
  } finally {
    refreshing = false;
  }
}

function scheduleTokenRefresh(token: string | null) {
  clearRefreshTimer();

  if (!token) {
    return;
  }

  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") {
    console.warn("Unable to schedule token refresh: missing expiration.");
    return;
  }

  if (isTokenExpired(payload)) {
    void refreshAuthToken();
    return;
  }

  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  const triggerAt = expiresAt - REFRESH_LEAD_MS;

  if (triggerAt <= now) {
    void refreshAuthToken();
    return;
  }

  const delay = Math.max(triggerAt - now, MIN_REFRESH_DELAY_MS);
  const scheduledToken = token;

  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    if (authTokenSignal.get() !== scheduledToken) {
      return;
    }
    void refreshAuthToken();
  }, delay);
}

function startAuthWatchers() {
  if (watchersStarted) {
    return;
  }
  watchersStarted = true;

  effect(() => {
    const token = authTokenSignal.get();
    const profile = authProfileSignal.get();

    scheduleTokenRefresh(token);

    if (!token && profile) {
      void refreshAuthToken();
    }
  });
}

startAuthWatchers();
