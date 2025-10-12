import { LitElement, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { waitForGoogleAccounts } from "@/lib/googleIdentity";
import { setAuthSession } from "@/services/authProvider";
import type { GoogleCredentialResponse } from "@/types";

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

    const accounts = await waitForGoogleAccounts();
    accounts.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        const token = response.credential;
        if (token) {
          setAuthSession(token);
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
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-google-auth": FamilyChatGoogleAuth;
  }
}
