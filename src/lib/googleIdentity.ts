/// <reference types="google.accounts" />

const POLL_INTERVAL_MS = 200;
const MAX_ATTEMPTS = 20;
const DEFAULT_CODE_TIMEOUT_MS = 60000;

let oauthModule: GoogleOAuthModule | null = null;
let oauthModulePromise: Promise<void> | null = null;

type ExtendedCodeClientConfig = google.accounts.oauth2.CodeClientConfig & {
  access_type?: "offline" | "online";
  prompt?: "" | "none" | "consent" | "select_account";
};

type GoogleOAuthModule = {
  initCodeClient(
    config: ExtendedCodeClientConfig,
  ): google.accounts.oauth2.CodeClient;
};

// waitForGoogleOAuth polls until the GIS OAuth helper is available. The GIS
// script loads asynchronously, so we either use the cached instance or retry
// until it shows up (or bail out after MAX_ATTEMPTS).
async function waitForGoogleOAuth(): Promise<GoogleOAuthModule> {
  if (typeof window === "undefined") {
    throw new Error(
      "Google Identity Services are unavailable in this environment.",
    );
  }

  const existing = window.google?.accounts?.oauth2;
  if (existing) {
    return existing as GoogleOAuthModule;
  }

  return new Promise<GoogleOAuthModule>((resolve, reject) => {
    let attempts = 0;
    const handle = window.setInterval(() => {
      const oauth2 = window.google?.accounts?.oauth2;
      attempts += 1;
      if (oauth2) {
        window.clearInterval(handle);
        resolve(oauth2 as GoogleOAuthModule);
      } else if (attempts >= MAX_ATTEMPTS) {
        window.clearInterval(handle);
        reject(new Error("Google OAuth client failed to load."));
      }
    }, POLL_INTERVAL_MS);
  });
}

// requestGoogleAuthorizationCode opens the Google OAuth popup and resolves with
// the one-time authorization code. We use the pop-up + `postmessage` redirect
// mode so the code is delivered directly to this page (no navigation). The
// returned code is later exchanged on the backend for tokens.
export async function requestGoogleAuthorizationCode(
  clientId: string,
): Promise<string> {
  if (!clientId) {
    throw new Error(
      "Google client ID is required to request an authorization code.",
    );
  }

  const oauth2 =
    oauthModule ??
    (window.google?.accounts?.oauth2 as GoogleOAuthModule | undefined);

  if (!oauth2) {
    throw new Error(
      "Google Sign-In is still loading. Please wait a moment and try again.",
    );
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const codeClientConfig: ExtendedCodeClientConfig = {
      client_id: clientId,
      // Request OpenID Connect identity claims plus email/profile.
      scope: "openid email profile",
      // Use a popup instead of redirecting the SPA.
      ux_mode: "popup",
      // postmessage delivers the response to the opener window.
      redirect_uri: "postmessage",
      // offline + consent ensures a refresh token the first time.
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      callback: (response: google.accounts.oauth2.CodeResponse) => {
        if (settled) {
          return;
        }
        if (response.code) {
          settled = true;
          resolve(response.code);
        } else {
          settled = true;
          reject(
            new Error("Google authorization response did not include a code."),
          );
        }
      },
      error_callback: (error: google.accounts.oauth2.ClientConfigError) => {
        if (settled) {
          return;
        }
        settled = true;
        const message =
          error.message ||
          (error.type === "popup_closed"
            ? "Authorization popup was closed before completing."
            : "Failed to complete Google authorization.");
        reject(new Error(message));
      },
    };

    const codeClient = oauth2.initCodeClient(codeClientConfig);

    codeClient.requestCode();

    if (DEFAULT_CODE_TIMEOUT_MS > 0) {
      window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(
          new Error("Timed out while waiting for Google authorization code."),
        );
      }, DEFAULT_CODE_TIMEOUT_MS);
    }
  });
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuthModule;
      };
    };
  }
}

export async function preloadGoogleOAuth() {
  if (oauthModule) {
    return;
  }

  if (!oauthModulePromise) {
    oauthModulePromise = waitForGoogleOAuth()
      .then((module) => {
        oauthModule = module;
      })
      .finally(() => {
        oauthModulePromise = null;
      });
  }

  await oauthModulePromise;
}
