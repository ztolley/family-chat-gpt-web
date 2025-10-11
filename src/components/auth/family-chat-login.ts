import "@awesome.me/webawesome/dist/components/avatar/avatar.js";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js";
import "@awesome.me/webawesome/dist/components/dropdown/dropdown.js";
import { LitElement, css, html, nothing } from "lit";
import { SignalWatcher } from "@lit-labs/signals";
import { customElement, query, state } from "lit/decorators.js";
import { effect } from "@/lib/signalHelpers";
import {
  authProfileSignal,
  authTokenSignal,
  clearAuthSession,
} from "@/services/authProvider";
import {
  ensureGoogleConfigLoaded,
  googleClientIdSignal,
  googleConfigErrorSignal,
} from "@/services/authSessionManager";
import type { UserProfile } from "@/types";
import type { FamilyChatGoogleAuth } from "./family-chat-google-auth";

const SignalElement = SignalWatcher(LitElement) as typeof LitElement;

@customElement("family-chat-login")
export class FamilyChatLogin extends SignalElement {
  @state() private googleClientId: string | null = null;
  @state() private googleError: string | null = null;
  @query("#google-signin") private googleTarget?: HTMLDivElement;
  @query("family-chat-google-auth") private googleAuth?: FamilyChatGoogleAuth;

  private googleButtonReady = false;
  private lastRenderedClientId: string | null = null;
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

    .google-button {
      min-height: 40px;
      min-width: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .auth-message {
      color: var(--wa-color-danger-500, #dc2626);
      font-size: 0.75rem;
    }

    .account-dropdown {
      display: flex;
    }

    .avatar-trigger wa-avatar::part(base) {
      border: 1px solid var(--wa-color-surface-border, #d5d8e0);
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
      const clientId = googleClientIdSignal.get();
      const error = googleConfigErrorSignal.get();
      if (this.googleClientId !== clientId) {
        this.googleClientId = clientId;
        this.googleButtonReady = false;
        this.lastRenderedClientId = null;
        void this.updateComplete.then(() => this.tryRenderGoogleButton());
      }
      if (this.googleError !== error) {
        this.googleError = error;
      }

      const token = authTokenSignal.get();
      if (!token && clientId) {
        this.googleButtonReady = false;
        void this.updateComplete.then(() => this.tryRenderGoogleButton());
      }
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
    await this.updateComplete;
    this.tryRenderGoogleButton();
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
        <div id="google-signin" class="google-button"></div>
        <family-chat-google-auth></family-chat-google-auth>
        ${this.googleError
          ? html`<span class="auth-message">${this.googleError}</span>`
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

  private tryRenderGoogleButton() {
    if (
      !this.googleTarget ||
      !this.googleAuth ||
      !this.googleClientId ||
      authTokenSignal.get()
    ) {
      return;
    }

    const clientId = this.googleClientId;

    if (this.googleButtonReady && this.lastRenderedClientId === clientId) {
      return;
    }

    this.googleAuth
      .renderButton(this.googleTarget, clientId)
      .then(() => {
        this.googleButtonReady = true;
        this.lastRenderedClientId = clientId;
        this.googleError = null;
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Google Sign-In failed.";
        this.googleError = message;
      });
  }

  private handleDropdownSelect(event: CustomEvent<{ item: HTMLElement }>) {
    const value = event.detail.item?.getAttribute?.("value");
    if (value === "logout") {
      clearAuthSession();
      this.googleButtonReady = false;
      this.lastRenderedClientId = null;
      void this.updateComplete.then(() => this.tryRenderGoogleButton());
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
