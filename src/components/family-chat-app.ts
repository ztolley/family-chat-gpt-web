import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/icon/icon.js";
import "@awesome.me/webawesome/dist/components/card/card.js";
import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import {
  authProfileSignal,
  isAuthenticatedSignal,
} from "@/services/authProvider";
import { toggleSidebar } from "@/services/uiState";

const SignalElement = SignalWatcher(LitElement) as typeof LitElement;

@customElement("family-chat-app")
export class FamilyChatApp extends SignalElement {
  static styles = css`
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: var(--wa-font-family-body);
      font-weight: var(--wa-font-weight-body);
      line-height: var(--wa-line-height-normal);
    }

    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--wa-color-surface-lowered);
      border-bottom: 1px solid var(--wa-color-surface-border);
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
      font-size: 1.1rem;
      letter-spacing: 0.01em;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #38bdf8, #6366f1);
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .menu-button {
      display: none;
    }

    .content {
      flex: 1;
      min-height: 0;
      display: flex;
      position: relative;
    }

    .main-area {
      flex: 1;
      min-height: 0;
      display: flex;
      justify-content: center;
      padding: 2rem 2.5rem 2.5rem;
      overflow: auto;
    }

    .main-inner {
      width: min(900px, 100%);
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    @media (max-width: 960px) {
      .menu-button {
        display: inline-flex;
      }

      .main-area {
        padding: 1.5rem 1.25rem 2.25rem;
      }
    }
  `;

  render() {
    const isAuthenticated = isAuthenticatedSignal.value;
    const profile = authProfileSignal.value;

    return html`
      <div class="app-shell">
        <header class="top-bar">
          <div class="brand">
            <wa-button
              class="menu-button"
              variant="neutral"
              size="small"
              aria-label="Toggle navigation"
              @click=${toggleSidebar}
            >
              <wa-icon
                library="app"
                name="bars"
                label="Toggle navigation"
              ></wa-icon>
            </wa-button>
            <span class="brand-mark">FC</span>
            <span>FamilyChat</span>
          </div>
          <family-chat-login></family-chat-login>
        </header>

        <div class="content">
          <family-chat-sidebar
            .profile=${profile}
            .authenticated=${isAuthenticated}
          ></family-chat-sidebar>

          <main class="main-area">
            <div class="main-inner">
              ${isAuthenticated
                ? html`<family-chat-items></family-chat-items>`
                : this.renderWelcomeCard()}
            </div>
          </main>
        </div>
      </div>
    `;
  }

  private renderWelcomeCard() {
    return html`
      <wa-card class="welcome-card">
        <strong>Welcome to FamilyChat</strong>
        <p>Sign in to start planning and sharing updates with your family.</p>
      </wa-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-app": FamilyChatApp;
  }
}
