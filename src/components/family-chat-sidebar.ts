import "@awesome.me/webawesome/dist/components/drawer/drawer.js";
import "@awesome.me/webawesome/dist/components/card/card.js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { closeSidebar, sidebarOpenSignal } from "@/services/uiState";
import type { UserProfile } from "@/types";

const SignalElement = SignalWatcher(LitElement) as typeof LitElement;

@customElement("family-chat-sidebar")
export class FamilyChatSidebar extends SignalElement {
  @property({ type: Object }) profile: UserProfile | null = null;
  @property({ type: Boolean }) authenticated = false;

  static styles = css`
    :host {
      display: contents;
    }

    .sidebar-base {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sidebar-base.desktop {
      width: 260px;
      min-height: 100%;
      background: var(--wa-color-surface-raised);
      border-right: 1px solid var(--wa-color-surface-border);
      box-shadow: var(--wa-shadow-m);
      padding: 1.25rem 1rem;
    }

    @media (max-width: 960px) {
      .desktop {
        display: none !important;
      }
    }
  `;

  render() {
    const open = sidebarOpenSignal.value;

    return html`
      <aside class="sidebar-base desktop">${this.renderSidebarContent()}</aside>
      <wa-drawer
        class="sidebar-drawer"
        placement="start"
        ?open=${open}
        @wa-request-close=${closeSidebar}
        @wa-after-hide=${closeSidebar}
        without-header
      >
        <div class="sidebar-base">${this.renderSidebarContent()}</div>
      </wa-drawer>
    `;
  }

  private renderSidebarContent() {
    const name = this.profile?.name ?? this.profile?.email ?? "Guest";

    return html`
      <h2>Chats</h2>
      <wa-card class="sidebar-card">
        ${this.authenticated
          ? html`Signed in as <strong>${name}</strong>`
          : html`Conversations will appear here soon.`}
      </wa-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-sidebar": FamilyChatSidebar;
  }
}
