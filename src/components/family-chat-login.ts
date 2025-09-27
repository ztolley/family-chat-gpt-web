import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
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

    .panel {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: center;
      text-align: center;
    }

    .login-actions sl-button::part(base) {
      width: 100%;
    }

    .auth-message {
      margin: 0;
      font-size: 0.95rem;
      color: #dc2626;
    }

    .session-message {
      margin: 0;
    }

    .session-actions {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    @media (max-width: 600px) {
      .panel {
        padding: 1.5rem 1rem;
      }
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
    return this.hasSession ? this.renderSession() : this.renderLogin();
  }

  private renderLogin() {
    return html`
      <section class="panel">
        <div id="google-signin"></div>
        ${this.googleMessage
          ? html`<p class="auth-message">${this.googleMessage}</p>`
          : nothing}
        <div class="login-actions">
          <sl-button
            id="apple-signin"
            variant="default"
            type="button"
            size="medium"
            ?disabled=${this.appleDisabled}
            @click=${this.handleAppleClick}
          >
            ${this.appleLabel}
          </sl-button>
        </div>
      </section>
    `;
  }

  private renderSession() {
    return html`
      <section class="panel">
        <p class="session-message">You are currently signed in.</p>
        <div class="session-actions">
          <sl-button
            variant="text"
            type="button"
            @click=${this.handleLogoutClick}
          >
            Log out
          </sl-button>
        </div>
      </section>
    `;
  }

  async logout() {
    authProvider.logout();
    this.googleMessage = null;
    this.appleLabel = "Sign in with Apple";
    this.resetGoogleButton();
    this.dispatchEvent(
      new CustomEvent("auth-logout", {
        bubbles: true,
        composed: true,
      }),
    );
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
