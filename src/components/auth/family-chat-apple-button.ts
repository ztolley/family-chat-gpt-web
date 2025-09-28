import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

const POLL_INTERVAL = 200;
const MAX_ATTEMPTS = 20;

@customElement("family-chat-apple-button")
export class FamilyChatAppleButton extends LitElement {
  @property({ type: String })
  label = "Sign in with Apple";

  @property({ type: String })
  clientId: string | null = null;

  @property({ type: String })
  scope = "name email";

  @property({ type: Boolean })
  usePopup = true;

  @property({ type: String })
  redirectUri = "";

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @state() private statusMessage: string | null = null;
  @state() private internalDisabled = true;

  private initialized = false;
  private pollHandle: number | null = null;
  private pollAttempts = 0;
  private readonly handleAppleSignIn = (event: {
    authorization?: {
      id_token?: string;
    };
  }) => {
    const token = event?.authorization?.id_token;
    if (token) {
      this.dispatchEvent(
        new CustomEvent("apple-token", {
          detail: { token },
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      this.failWith("Apple Sign-In failed.");
    }
  };

  constructor() {
    super();
    this.redirectUri = `${window.location.origin}/auth/apple/callback`;
  }

  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      padding: 0 1.1rem;
      min-height: 44px;
      border: none;
      border-radius: 12px;
      background: #000;
      color: #fff;
      font-family:
        "SF Pro Text",
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition:
        transform 0.18s ease,
        filter 0.18s ease;
    }

    button:hover {
      filter: brightness(1.08);
    }

    button:active {
      transform: scale(0.98);
    }

    button:focus-visible {
      outline: 2px solid #0a84ff;
      outline-offset: 3px;
    }

    button:disabled,
    :host([disabled]) button {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .icon svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    .label {
      display: inline-flex;
      align-items: center;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.requestInitialization();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearPolling();
    if (window.AppleID?.auth?.onAppleIDSignIn === this.handleAppleSignIn) {
      window.AppleID.auth.onAppleIDSignIn = undefined;
    }
  }

  protected updated(changed: Map<keyof this, unknown>) {
    if (
      changed.has("clientId") ||
      changed.has("scope") ||
      changed.has("redirectUri") ||
      changed.has("usePopup")
    ) {
      this.initialized = false;
      this.clearPolling();
      this.requestInitialization();
    }
  }

  render() {
    const label = this.statusMessage ?? this.label;
    const isDisabled = this.disabled || this.internalDisabled;

    return html`
      <button
        type="button"
        ?disabled=${isDisabled}
        aria-label=${label}
        @click=${this.handleClick}
      >
        <span class="icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            fill="currentColor"
          >
            <path
              d="M318.7 268.7c-.2 36.7 16.4 64.6 50.2 85.5c-18.9 27.6-46.2 43.6-81.9 48.4c-34.5 4.7-72.3-20.9-85.8-20.9c-13.5 0-47.6 20.2-74 19.6c-54.3-.9-114.2-53.9-114.2-143.6c0-86 52.7-131.2 103-132.1c27.2-.5 52.6 18 70.1 18c17.5 0 48.3-22.2 81.3-18.9c13.8.6 52.5 5.4 77.1 41.1c-2 1.4-46.2 27.2-45.8 77.9zm-59.1-178.4c14.7-17.9 24.6-42.9 21.9-67.9c-21.2.8-46.6 14.2-61.7 32c-13.5 15.7-25.1 40.6-22 64.5c23.2 1.8 47.1-11.8 61.8-28.6z"
            ></path>
          </svg>
        </span>
        <span class="label">${label}</span>
      </button>
    `;
  }

  private handleClick(event: Event) {
    if (this.disabled || this.internalDisabled) {
      event.preventDefault();
      return;
    }

    try {
      window.AppleID?.auth?.signIn();
    } catch (error) {
      console.error(error);
      this.failWith("Apple Sign-In failed to start.");
    }
  }

  private requestInitialization() {
    if (!this.clientId) {
      this.statusMessage = null;
      this.internalDisabled = true;
      this.clearPolling();
      return;
    }

    if (this.initialized) {
      return;
    }

    if (window.AppleID?.auth) {
      this.initializeApple();
      return;
    }

    this.statusMessage = "Preparing Apple Sign-In…";
    this.internalDisabled = true;

    if (this.pollHandle !== null) {
      return;
    }

    this.pollAttempts = 0;
    this.pollHandle = window.setInterval(() => {
      this.pollAttempts += 1;
      if (window.AppleID?.auth) {
        this.clearPolling();
        this.initializeApple();
      } else if (this.pollAttempts >= MAX_ATTEMPTS) {
        this.clearPolling();
        this.failWith("Apple Sign-In unavailable");
      }
    }, POLL_INTERVAL);
  }

  private initializeApple() {
    if (!this.clientId || !window.AppleID?.auth) {
      this.failWith("Apple Sign-In not configured");
      return;
    }

    try {
      const redirectUri = this.resolveRedirectUri();
      window.AppleID.auth.init({
        clientId: this.clientId,
        scope: this.scope,
        redirectURI: redirectUri,
        usePopup: this.usePopup,
      });

      window.AppleID.auth.onAppleIDSignIn = this.handleAppleSignIn;
      this.initialized = true;
      this.statusMessage = null;
      this.internalDisabled = false;
    } catch (error) {
      console.error(error);
      this.failWith("Apple Sign-In setup error");
    }
  }

  private resolveRedirectUri() {
    if (!this.redirectUri) {
      return `${window.location.origin}/auth/apple/callback`;
    }

    try {
      return new URL(this.redirectUri, window.location.origin).toString();
    } catch {
      return this.redirectUri;
    }
  }

  private failWith(message: string) {
    this.statusMessage = message;
    this.internalDisabled = true;
    this.dispatchEvent(
      new CustomEvent("apple-error", {
        detail: { message },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private clearPolling() {
    if (this.pollHandle !== null) {
      window.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-apple-button": FamilyChatAppleButton;
  }

  interface Window {
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
