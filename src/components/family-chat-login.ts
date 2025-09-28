import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import "@awesome.me/webawesome/dist/components/avatar/avatar.js";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/divider/divider.js";
import "@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js";
import "@awesome.me/webawesome/dist/components/dropdown/dropdown.js";
import "@awesome.me/webawesome/dist/components/icon/icon.js";
import type {
  AuthBackendProvider,
  GoogleCredentialResponse,
  StatusType,
  UserProfile,
} from "@/types";
import { authProvider, type AuthState } from "@/services/authProvider";
import { fetchConfig } from "@/lib/authHelpers";

const MAX_GOOGLE_RETRIES = 20;

@customElement("family-chat-login")
export class FamilyChatLogin extends LitElement {
  @state() private hasSession = false;
  @state() private profile: UserProfile | null = null;
  @state() private googleMessage: string | null = null;
  @state() private appleDisabled = false;
  @state() private appleLabel = "Sign in with Apple";

  @query("#google-signin")
  private googleSignInElement?: HTMLDivElement;

  private googleClientId: string | null = null;
  private appleClientId: string | null = null;
  private googleInitialized = false;
  private googleRetryHandle: number | null = null;
  private appleInitialized = false;
  private unsubscribeAuth?: () => void;

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
    this.unsubscribeAuth = authProvider.subscribe(this.handleAuthChange);
  }

  protected async firstUpdated() {
    await this.initialize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.googleRetryHandle) {
      window.clearInterval(this.googleRetryHandle);
      this.googleRetryHandle = null;
    }
    this.unsubscribeAuth?.();
  }

  render() {
    return html`
      <div class="auth-controls">
        ${this.hasSession ? this.renderSession() : this.renderLogin()}
      </div>
    `;
  }

  private renderLogin() {
    return html`
      <div class="login-buttons">
        <div id="google-signin" class="google-button"></div>
        ${this.googleMessage
          ? html`<span class="auth-message">${this.googleMessage}</span>`
          : nothing}
        <wa-button
          variant="primary"
          size="medium"
          ?disabled=${this.appleDisabled}
          @click=${this.handleAppleClick}
        >
          <wa-icon slot="prefix" name="brands:apple"></wa-icon>
          ${this.appleLabel}
        </wa-button>
      </div>
    `;
  }

  private renderSession() {
    const name = this.profile?.name ?? this.profile?.email ?? "Account";
    const email = this.profile?.email ?? "";
    const initials = this.getInitials(name);

    return html`
      <wa-dropdown
        class="account-dropdown"
        distance="8"
        @wa-select=${this.handleDropdownSelect}
      >
        <wa-button slot="trigger" variant="text" class="avatar-trigger">
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

  async logout() {
    authProvider.logout();
    this.googleMessage = null;
    this.appleLabel = "Sign in with Apple";
    this.emitStatus("Signed out.");
  }

  private async handleLogoutClick() {
    await this.logout();
  }

  private async initialize() {
    this.emitStatus("Loading configuration…");
    try {
      const config = await fetchConfig();
      this.googleClientId = config.googleClientId ?? null;
      this.appleClientId = config.appleClientId ?? null;
      this.emitStatus("Ready.");
      this.initGoogleLogin();
      this.initAppleLogin();
      this.tryRestoreSession();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load configuration.";
      this.emitStatus(message, "error");
      this.appleDisabled = true;
      this.appleLabel = "Apple Sign-In unavailable";
      this.googleMessage = message;
    }
  }

  private handleAuthChange = (state: AuthState) => {
    const wasSession = this.hasSession;
    const hasSession = Boolean(state.token);
    this.hasSession = hasSession;
    this.profile = state.profile;
    if (!state.token) {
      this.googleMessage = null;
      this.appleLabel = "Sign in with Apple";
    }
    if (wasSession && !hasSession) {
      this.resetGoogleButton();
    }
  };

  private tryRestoreSession() {
    const alreadyActive = Boolean(authProvider.getState().token);
    if (alreadyActive) {
      this.emitStatus("Session restored.", "success");
      return;
    }

    const restored = authProvider.restore();
    if (restored) {
      this.emitStatus("Session restored.", "success");
    }
  }

  private initGoogleLogin() {
    if (this.googleInitialized) {
      return;
    }

    const container = this.googleSignInElement;
    if (!container) {
      return;
    }

    if (!this.googleClientId) {
      this.googleMessage = "Google Sign-In not configured.";
      return;
    }

    const start = () => {
      const googleAccounts = window.google?.accounts?.id;
      if (!googleAccounts) {
        this.googleMessage = "Google Sign-In failed to load.";
        return;
      }

      container.innerHTML = "";
      googleAccounts.initialize({
        client_id: this.googleClientId!,
        callback: (response: GoogleCredentialResponse) => {
          const token = response.credential;
          if (token) {
            this.handleCredential("google", token);
          } else {
            this.emitStatus("Google Sign-In failed.", "error");
          }
        },
      });

      googleAccounts.renderButton(container, {
        theme: "filled_blue",
        size: "large",
        type: "standard",
      });

      this.googleMessage = null;
      this.googleInitialized = true;
    };

    const googleAccounts = window.google?.accounts?.id;
    if (googleAccounts) {
      start();
      return;
    }

    let attempts = 0;
    this.googleRetryHandle = window.setInterval(() => {
      attempts += 1;
      if (window.google?.accounts?.id) {
        if (this.googleRetryHandle) {
          window.clearInterval(this.googleRetryHandle);
          this.googleRetryHandle = null;
        }
        start();
      } else if (attempts > MAX_GOOGLE_RETRIES) {
        if (this.googleRetryHandle) {
          window.clearInterval(this.googleRetryHandle);
          this.googleRetryHandle = null;
        }
        this.googleMessage = "Google Sign-In failed to load.";
      }
    }, 200);
  }

  private initAppleLogin() {
    if (this.appleInitialized) {
      return;
    }

    if (!window.AppleID) {
      this.appleDisabled = true;
      this.appleLabel = "Apple Sign-In unavailable";
      return;
    }

    if (!this.appleClientId) {
      this.appleDisabled = true;
      this.appleLabel = "Apple Sign-In not configured";
      return;
    }

    try {
      window.AppleID.auth.init({
        clientId: this.appleClientId,
        scope: "name email",
        redirectURI: `${window.location.origin}/auth/apple/callback`,
        usePopup: true,
      });

      window.AppleID.auth.onAppleIDSignIn = (event: {
        authorization?: {
          id_token?: string;
        };
      }) => {
        const token = event?.authorization?.id_token;
        if (token) {
          this.handleCredential("apple", token);
        } else {
          this.emitStatus("Apple Sign-In failed.", "error");
        }
      };

      this.appleDisabled = false;
      this.appleLabel = "Sign in with Apple";
      this.appleInitialized = true;
    } catch (error) {
      console.error(error);
      this.appleDisabled = true;
      this.appleLabel = "Apple Sign-In setup error";
    }
  }

  private handleAppleClick() {
    if (!this.appleInitialized) {
      return;
    }
    window.AppleID?.auth.signIn();
  }

  private handleCredential(provider: AuthBackendProvider, token: string) {
    authProvider.login(provider, token);
    this.googleMessage = null;
    this.appleLabel = "Sign in with Apple";
    this.emitStatus("Signed in.", "success");
    const state = authProvider.getState();
    if (state.token && state.profile) {
      this.dispatchAuthEvent("auth-success", state.token, state.profile);
    }
  }

  private handleDropdownSelect(event: CustomEvent<{ item: HTMLElement }>) {
    const value = (
      event.detail.item as HTMLElement | undefined
    )?.getAttribute?.("value");
    if (value === "logout") {
      this.handleLogoutClick();
    }
  }

  private resetGoogleButton() {
    if (this.googleRetryHandle) {
      window.clearInterval(this.googleRetryHandle);
      this.googleRetryHandle = null;
    }
    this.googleInitialized = false;
    this.googleSignInElement?.replaceChildren();
    void this.updateComplete.then(() => {
      this.initGoogleLogin();
    });
  }

  private emitStatus(message: string | null, type: StatusType = "") {
    this.dispatchEvent(
      new CustomEvent("auth-status", {
        detail: { message, type },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private dispatchAuthEvent(
    name: "auth-success" | "auth-restored",
    token: string,
    profile: UserProfile,
  ) {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { token, profile },
        bubbles: true,
        composed: true,
      }),
    );
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

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize(options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }): void;
          renderButton(
            element: HTMLElement,
            options: Record<string, unknown>,
          ): void;
        };
      };
    };
    AppleID?: {
      auth: {
        init(options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }): void;
        onAppleIDSignIn?: (event: {
          authorization?: {
            id_token?: string;
          };
        }) => void;
        signIn(): void;
      };
    };
  }
}
