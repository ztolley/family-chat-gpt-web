/**
 * Orchestrates token refresh logic and config loading.
 *
 * authProvider.ts owns the state; this module owns the behaviour: fetching the
 * server config, deciding when to refresh the ID token, and invoking the backend
 * refresh endpoint. Keeping them separate makes it easier to test and reason
 * about each concern in isolation and keeps UI-facing code simple.
 */
import { signal } from "@lit-labs/signals";
import { effect } from "@/lib/signalHelpers";
import { decodeJwt, fetchConfig, isTokenExpired } from "@/lib/authHelpers";
import {
  authProfileSignal,
  authTokenSignal,
  authRefreshTokenSignal,
  clearAuthSession,
  setAuthSession,
} from "./authProvider";

// Refresh slightly ahead of expiry so API calls never receive an expired token.
const REFRESH_LEAD_MS = 2 * 60 * 1000;
// Clamp the timeout so we refresh soon even if the token is already close to expiring.
const MIN_REFRESH_DELAY_MS = 5 * 1000;

export const googleClientIdSignal = signal<string | null>(null);
export const googleConfigErrorSignal = signal<string | null>(null);

let configPromise: Promise<void> | null = null;
let refreshTimer: number | null = null;
let refreshing = false;
let watchersStarted = false;

// loadConfigInternal fetches server configuration and surfaces the Google client
// ID to signals consumed by the UI.
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

// ensureGoogleConfigLoaded de-duplicates concurrent config fetches.
export async function ensureGoogleConfigLoaded() {
  if (!configPromise) {
    configPromise = loadConfigInternal().finally(() => {
      configPromise = null;
    });
  }
  await configPromise;
}

// clearRefreshTimer cancels any pending scheduled refresh.
function clearRefreshTimer() {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// refreshGoogleToken calls the backend refresh endpoint using the stored refresh token.
async function refreshGoogleToken() {
  const refreshToken = authRefreshTokenSignal.get();
  if (!refreshToken) {
    throw new Error("Refresh token is not available.");
  }

  const response = await fetch(`/auth/google/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Failed to refresh tokens (status ${response.status}).`,
    );
  }

  const payload = (await response.json()) as {
    idToken: string;
    refreshToken?: string | null;
  };

  const nextRefreshToken = payload.refreshToken ?? refreshToken;
  setAuthSession(payload.idToken, nextRefreshToken);
}

// performTokenRefresh serialises refresh attempts so we never ask Google twice at the same time.
async function performTokenRefresh({ suppressLogout = false } = {}) {
  if (refreshing) {
    throw new Error("Token refresh already in progress.");
  }

  refreshing = true;
  try {
    await refreshGoogleToken();
  } catch (error) {
    console.error(error);
    if (!suppressLogout) {
      clearAuthSession();
    }
    throw error;
  } finally {
    refreshing = false;
  }
}

// refreshAuthToken is the timer-friendly wrapper: log errors but don't throw so schedulers keep running.
async function refreshAuthToken() {
  try {
    await performTokenRefresh();
  } catch {
    // Logged and session handled inside performTokenRefresh.
  }
}

// scheduleTokenRefresh sets a timeout relative to the JWT `exp` claim.
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

// startAuthWatchers initialises reactive observers exactly once.
// Whenever the token signal updates we reschedule the timeout; when a profile exists
// but the token is missing we trigger an immediate refresh attempt.
function startAuthWatchers() {
  if (watchersStarted) {
    return;
  }
  watchersStarted = true;

  effect(() => {
    const token = authTokenSignal.get();
    const profile = authProfileSignal.get();
    const refreshToken = authRefreshTokenSignal.get();

    scheduleTokenRefresh(token);

    if (!token && profile && refreshToken) {
      void refreshAuthToken();
    }
  });
}

startAuthWatchers();
