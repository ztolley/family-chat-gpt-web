import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { StatusType } from "@/types";
import "./family-chat-login";
import "./family-chat-items";

@customElement("family-chat-app")
export class FamilyChatApp extends LitElement {
  @state() private statusMessage: string | null = null;
  @state() private statusType: StatusType = "";

  static styles = css`
    :host {
      display: block;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      color: #1f2933;
    }

    main {
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      max-width: 720px;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      min-height: 100vh;
      background: #f4f6fb;
    }

    h1 {
      text-align: center;
      margin: 0;
    }

    @media (max-width: 600px) {
      main {
        padding: 1.5rem 1rem 3rem;
      }
    }
  `;

  render() {
    return html`
      <main>
        <h1>FamilyChat Items</h1>
        <family-chat-login
          @auth-status=${this.handleStatus}
        ></family-chat-login>
        <family-chat-items
          @items-status=${this.handleStatus}
        ></family-chat-items>
        <status-banner
          message=${this.statusMessage ?? ""}
          type=${this.statusType}
        ></status-banner>
      </main>
    `;
  }

  private handleStatus(
    event: CustomEvent<{ message: string | null; type: StatusType }>,
  ) {
    this.statusMessage = event.detail.message;
    this.statusType = event.detail.type;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-app": FamilyChatApp;
  }
}
