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

    .google-signin-button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      height: 42px;
      padding: 0 1.5rem;
      border: 1px solid #dadce0;
      border-radius: 4px;
      background-color: #fff;
      color: #3c4043;
      font-family: "Roboto", "Helvetica Neue", Arial, sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow:
        0 1px 2px rgba(60, 64, 67, 0.3),
        0 1px 3px 1px rgba(60, 64, 67, 0.15);
      transition:
        box-shadow 0.2s ease,
        background-color 0.2s ease;
    }

    .google-signin-button:hover:not(:disabled) {
      box-shadow:
        0 1px 3px rgba(60, 64, 67, 0.3),
        0 4px 8px 3px rgba(60, 64, 67, 0.15);
      background-color: #f8f9fa;
    }

    .google-signin-button:active:not(:disabled) {
      box-shadow:
        0 1px 3px rgba(60, 64, 67, 0.3),
        0 2px 6px 2px rgba(60, 64, 67, 0.2);
      background-color: #f1f3f4;
    }

    .google-signin-button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.35);
    }

    .google-signin-button:disabled {
      cursor: default;
      box-shadow: none;
      background-color: #f1f3f4;
      color: #9aa0a6;
      border-color: #dadce0;
    }

    .google-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
    }

    .google-spinner {
      position: relative;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(60, 64, 67, 0.2);
      border-top-color: rgba(60, 64, 67, 0.6);
      animation: spin 0.8s linear infinite;
    }

    .button-label {
      display: inline-flex;
      align-items: center;
      line-height: 1;
      white-space: nowrap;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
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
        <button
          class="google-signin-button"
          type="button"
          ?disabled=${this.signInPending}
          aria-busy=${this.signInPending ? "true" : "false"}
          @click=${this.handleSignIn}
        >
          ${this.signInPending
            ? html`<span class="google-spinner" aria-hidden="true"></span>`
            : html`
                <span class="google-icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    xmlns="http://www.w3.org/2000/svg"
                    focusable="false"
                  >
                    <path
                      fill="#4285f4"
                      d="M17.64 9.2045c0-.6385-.0575-1.252-.164-1.8385H9v3.481h4.844a4.1475 4.1475 0 0 1-1.7995 2.7245v2.258h2.908c1.7005-1.5645 2.6875-3.869 2.6875-6.6255Z"
                    ></path>
                    <path
                      fill="#34a853"
                      d="M9 18c2.43 0 4.4675-.806 5.9565-2.196l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.3435 0-4.3285-1.5825-5.0365-3.708H.957v2.332C2.4385 15.982 5.481 18 9 18Z"
                    ></path>
                    <path
                      fill="#fbbc05"
                      d="M3.9635 10.698a5.4095 5.4095 0 0 1-.282-1.698c0-.5905.1035-1.1595.282-1.698V4.97H.957C.347 6.181.0015 7.5435.0015 8.9995c0 1.456.3455 2.8185.9555 4.03l3.0065-2.3315Z"
                    ></path>
                    <path
                      fill="#ea4335"
                      d="M9 3.5835c1.321 0 2.505.454 3.433 1.346l2.5755-2.5755C13.4645.89 11.427 0 9 0 5.481 0 2.4385 2.018 0 4.9695l3.9635 3.032C4.6715 5.1655 6.6565 3.5835 9 3.5835Z"
                    ></path>
                  </svg>
                </span>
              `}
          <span class="button-label">
            ${this.signInPending ? "Signing in…" : "Sign in with Google"}
          </span>
        </button>
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
