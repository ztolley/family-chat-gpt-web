import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("family-chat-empty-state")
export class FamilyChatEmptyState extends LitElement {
  @property({ type: String })
  message = "";

  static styles = css`
    :host {
      display: block;
    }

    .empty-state {
      text-align: center;
      color: var(--fc-color-text-secondary);
      padding: var(--fc-space-2xl-tight) var(--fc-space-md);
      border: 1px dashed var(--fc-color-border);
      border-radius: var(--fc-radius-md);
      background: var(--fc-color-bg-empty);
    }
  `;

  render() {
    return html`<div class="empty-state">${this.message}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-empty-state": FamilyChatEmptyState;
  }
}
