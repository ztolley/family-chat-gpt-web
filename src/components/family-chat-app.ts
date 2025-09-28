import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/icon/icon.js";
import "@awesome.me/webawesome/dist/components/drawer/drawer.js";
import "@awesome.me/webawesome/dist/components/card/card.js";
import { authProvider, type AuthState } from "@/services/authProvider";
import "./family-chat-login";
import "./items/family-chat-items";

@customElement("family-chat-app")
export class FamilyChatApp extends LitElement {
  @state() private authState: AuthState = authProvider.getState();
  @state() private sidebarOpen = false;
  private unsubscribeAuth?: () => void;

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--fc-color-bg-base);
      color: var(--fc-color-text-primary);
      font-family: var(--fc-font-family-base);
    }

    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--fc-color-bg-topbar);
      border-bottom: 1px solid var(--fc-color-border-subtle);
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
      background: var(--fc-gradient-brand);
      color: var(--fc-color-text-strong);
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
      background: var(--fc-gradient-content);
    }

    .sidebar-base {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 260px;
      min-height: 100%;
      background: var(--fc-color-bg-sidebar);
      border-right: 1px solid var(--fc-color-border-subtle);
      box-shadow: var(--fc-shadow-sidebar);
      padding: 1.25rem 1rem;
    }

    .sidebar-base h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--fc-color-text-strong);
    }

    .sidebar-card::part(base) {
      background: var(--fc-color-bg-card);
      border: 1px dashed var(--fc-color-border);
      border-radius: var(--fc-radius-md);
      color: var(--fc-color-text-secondary);
      text-align: center;
      line-height: 1.6;
      padding: 1.5rem;
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

    wa-drawer.drawer-panel {
      display: none;
    }

    wa-drawer.drawer-panel::part(panel) {
      width: 260px;
      background: var(--fc-color-bg-sidebar);
      padding: 1.5rem 1.25rem;
      border-right: 1px solid var(--fc-color-border-subtle);
      box-shadow: var(--fc-shadow-sidebar);
    }

    wa-drawer.drawer-panel::part(header) {
      display: none;
    }

    @media (max-width: 960px) {
      .menu-button {
        display: inline-flex;
      }

      .sidebar-base.desktop {
        display: none;
      }

      .main-area {
        padding: 1.5rem 1.25rem 2.25rem;
      }

      wa-drawer.drawer-panel {
        display: block;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeAuth = authProvider.subscribe((state) => {
      this.authState = state;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribeAuth?.();
  }

  private toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  private closeSidebar() {
    this.sidebarOpen = false;
  }

  render() {
    const isAuthenticated = Boolean(this.authState.token);

    return html`
      <div class="app-shell">
        <header class="top-bar">
          <div class="brand">
            <wa-button
              class="menu-button"
              variant="neutral"
              size="small"
              @click=${this.toggleSidebar}
            >
              <wa-icon name="classic:bars"></wa-icon>
            </wa-button>
            <span class="brand-mark">FC</span>
            <span>FamilyChat</span>
          </div>
          <family-chat-login></family-chat-login>
        </header>

        <div class="content">
          <aside class="sidebar-base desktop">
            ${this.renderSidebarContent()}
          </aside>

          <wa-drawer
            class="drawer-panel"
            placement="start"
            contained
            ?open=${this.sidebarOpen}
            @wa-after-hide=${this.closeSidebar}
          >
            ${this.renderSidebarContent()}
          </wa-drawer>

          <main class="main-area">
            ${isAuthenticated
              ? html`<div class="main-inner">
                  <family-chat-items></family-chat-items>
                </div>`
              : html`
                  <div class="main-inner">
                    <wa-card class="empty-state-card" variant="filled">
                      <h2 slot="header">Welcome to FamilyChat</h2>
                      Sign in with your preferred provider to start planning and
                      sharing updates with your family.
                    </wa-card>
                  </div>
                `}
          </main>
        </div>
      </div>
    `;
  }

  private renderSidebarContent() {
    return html`
      <div>
        <h2>Chats</h2>
        <wa-card class="sidebar-card" variant="outline">
          Conversations will appear here soon.
        </wa-card>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-app": FamilyChatApp;
  }
}
