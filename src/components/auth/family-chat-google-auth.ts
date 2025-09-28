import { LitElement, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { setAuthSession } from "@/services/authProvider";
import type { GoogleCredentialResponse } from "@/types";

const POLL_INTERVAL = 200;
const MAX_ATTEMPTS = 20;

type GoogleAccountsId = {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
};

@customElement("family-chat-google-auth")
export class FamilyChatGoogleAuth extends LitElement {
  render() {
    return nothing;
  }

  async renderButton(
    target: HTMLElement,
    clientId: string,
    options: Record<string, unknown> = {},
  ) {
    if (!target) {
      throw new Error("Google button container is required.");
    }
    if (!clientId) {
      throw new Error("Google client ID is required.");
    }

    const accounts = await this.waitForGoogle();
    accounts.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        const token = response.credential;
        if (token) {
          setAuthSession("google", token);
        }
      },
    });

    target.innerHTML = "";
    accounts.renderButton(target, {
      theme: "filled_blue",
      size: "large",
      type: "standard",
      ...options,
    });
  }

  private async waitForGoogle(): Promise<GoogleAccountsId> {
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
          reject(new Error("Google Sign-In failed to load."));
        }
      }, POLL_INTERVAL);
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-google-auth": FamilyChatGoogleAuth;
  }

  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}
