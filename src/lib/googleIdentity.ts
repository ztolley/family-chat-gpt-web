import type { GoogleCredentialResponse } from "@/types";

const POLL_INTERVAL_MS = 200;
const MAX_ATTEMPTS = 20;
const DEFAULT_PROMPT_TIMEOUT_MS = 10000;

export type GoogleAccountsId = {
  initialize(options: Record<string, unknown>): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
  prompt(callback?: (notification: PromptMomentNotification) => void): void;
  cancel?: () => void;
};

export type PromptMomentNotification = {
  isDismissedMoment?: () => boolean;
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getMomentType?: () => string;
};

export async function waitForGoogleAccounts(): Promise<GoogleAccountsId> {
  if (typeof window === "undefined") {
    throw new Error(
      "Google Identity Services are unavailable in this environment.",
    );
  }

  const existing = window.google?.accounts?.id;
  if (existing) {
    return existing as GoogleAccountsId;
  }

  return new Promise<GoogleAccountsId>((resolve, reject) => {
    let attempts = 0;
    const handle = window.setInterval(() => {
      const accounts = window.google?.accounts?.id;
      attempts += 1;
      if (accounts) {
        window.clearInterval(handle);
        resolve(accounts as GoogleAccountsId);
      } else if (attempts >= MAX_ATTEMPTS) {
        window.clearInterval(handle);
        reject(new Error("Google Identity Services client failed to load."));
      }
    }, POLL_INTERVAL_MS);
  });
}

export async function fetchGoogleCredential(
  clientId: string,
  options: {
    autoSelect?: boolean;
    promptTimeoutMs?: number;
    initializeOptions?: Record<string, unknown>;
  } = {},
): Promise<string> {
  if (!clientId) {
    throw new Error("Google client ID is required to fetch credentials.");
  }

  const accounts = await waitForGoogleAccounts();
  const timeoutMs = options.promptTimeoutMs ?? DEFAULT_PROMPT_TIMEOUT_MS;

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const credentialCallback = (response: GoogleCredentialResponse) => {
      if (settled) {
        return;
      }
      const token = response.credential;
      if (token) {
        settled = true;
        resolve(token);
      } else {
        settled = true;
        reject(new Error("Google credential response was empty."));
      }
    };

    accounts.initialize({
      client_id: clientId,
      callback: credentialCallback,
      auto_select: options.autoSelect ?? true,
      cancel_on_tap_outside: false,
      ...options.initializeOptions,
    });

    accounts.prompt((notification?: PromptMomentNotification) => {
      if (settled || !notification) {
        return;
      }
      const notDisplayed = notification.isNotDisplayed?.();
      const skipped = notification.isSkippedMoment?.();
      const dismissed = notification.isDismissedMoment?.();
      if (notDisplayed || skipped || dismissed) {
        settled = true;
        reject(new Error("Google credential prompt was skipped."));
      }
    });

    if (timeoutMs > 0) {
      window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        accounts.cancel?.();
        reject(new Error("Timed out while waiting for Google credential."));
      }, timeoutMs);
    }
  });
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}
