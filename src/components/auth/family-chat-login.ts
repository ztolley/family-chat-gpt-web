import "@awesome.me/webawesome/dist/components/avatar/avatar.js";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js";
import "@awesome.me/webawesome/dist/components/dropdown/dropdown.js";
import { LitElement, css, html, nothing } from "lit";
import { SignalWatcher } from "@lit-labs/signals";
import { customElement, state } from "lit/decorators.js";
import { effect } from "@/lib/signalHelpers";
import {
  authProfileSignal,
  authTokenSignal,
  clearAuthSession,
  setAuthSession,
} from "@/services/authProvider";
import {
  ensureGoogleConfigLoaded,
  googleClientIdSignal,
  googleConfigErrorSignal,
} from "@/services/authSessionManager";
import { requestGoogleAuthorizationCode } from "@/lib/googleIdentity";
import type { UserProfile } from "@/types";

const SignalElement = SignalWatcher(LitElement) as typeof LitElement;

@customElement("family-chat-login")
export class FamilyChatLogin extends SignalElement {
  @state() private googleClientId: string | null = null;
  @state() private googleError: string | null = null;
  @state() private signInPending = false;
  @state() private signInError: string | null = null;

  private disposeSignalsEffect?: () => void;

  static styles = css`
    :host {
      display: block;
    }

    .auth-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .login-buttons {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .auth-message {
      color: var(--wa-color-danger-500, #dc2626);
      font-size: 0.75rem;
    }

    .account-dropdown {
      display: flex;
    }

    .account-menu {
      display: flex;
      flex-direction: column;
      min-width: 200px;
    }

    .account-details {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--wa-color-surface-border, #d5d8e0);
      margin-bottom: 0.25rem;
      line-height: 1.4;
    }

    .account-details strong {
      display: block;
      font-size: 0.95rem;
    }

    .account-details span {
      color: var(--wa-color-text-quiet, #64748b);
      font-size: 0.8rem;
    }

    wa-dropdown-item::part(base) {
      font-size: 0.9rem;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.disposeSignalsEffect = effect(() => {
      this.googleClientId = googleClientIdSignal.get();
      this.googleError = googleConfigErrorSignal.get();
      authTokenSignal.get();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disposeSignalsEffect?.();
  }

  async firstUpdated() {
    await ensureGoogleConfigLoaded();
    this.googleClientId = googleClientIdSignal.get();
    this.googleError = googleConfigErrorSignal.get();
  }

  render() {
    const token = authTokenSignal.get();
    const profile = authProfileSignal.get();

    return html`
      <div class="auth-controls">
        ${token && profile ? this.renderSession(profile) : this.renderLogin()}
      </div>
    `;
  }

  private renderLogin() {
    if (!this.googleClientId) {
      return html`
        <div class="login-buttons">
          <span class="auth-message">
            ${this.googleError ?? "Google Sign-In is not configured."}
          </span>
        </div>
      `;
    }

    return html`
      <div class="login-buttons">
        <wa-button
          variant="brand"
          size="medium"
          ?loading=${this.signInPending}
          @click=${this.handleSignIn}
        >
          Sign in with Google
        </wa-button>
        ${this.signInError
          ? html`<span class="auth-message">${this.signInError}</span>`
          : nothing}
      </div>
    `;
  }

  private renderSession(profile: UserProfile) {
    const name = profile.name ?? profile.email ?? "Account";
    const email = profile.email ?? "";
    const initials = this.getInitials(name);

    return html`
      <wa-dropdown
        class="account-dropdown"
        distance="8"
        @wa-select=${this.handleDropdownSelect}
      >
        <wa-button slot="trigger" variant="neutral" class="avatar-trigger">
          <wa-avatar
            initials=${initials}
            label=${name}
            shape="circle"
            size="medium"
          ></wa-avatar>
        </wa-button>
        <div class="account-menu">
          <div class="account-details">
            <strong>${name}</strong>
            ${email ? html`<span>${email}</span>` : nothing}
          </div>
          <wa-dropdown-item value="logout">Log out</wa-dropdown-item>
        </div>
      </wa-dropdown>
    `;
  }

  private async handleSignIn() {
    if (this.signInPending) {
      return;
    }

    await ensureGoogleConfigLoaded();
    const clientId = googleClientIdSignal.get();
    if (!clientId) {
      this.signInError = "Google Sign-In is not configured.";
      return;
    }

    this.signInPending = true;
    this.signInError = null;
    try {
      const code = await requestGoogleAuthorizationCode(clientId);
      const response = await fetch(`/auth/google/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to exchange authorization code.");
      }

      const payload = (await response.json()) as {
        idToken: string;
        refreshToken?: string | null;
      };

      setAuthSession(payload.idToken, payload.refreshToken ?? null);
    } catch (error) {
      this.signInError =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
    } finally {
      this.signInPending = false;
    }
  }

  private async handleDropdownSelect(
    event: CustomEvent<{ item: HTMLElement }>,
  ) {
    const value = event.detail.item?.getAttribute?.("value");
    if (value === "logout") {
      clearAuthSession();
    }
  }

  private getInitials(value: string) {
    return value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .padEnd(2, "F")
      .slice(0, 2);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-login": FamilyChatLogin;
  }
}
