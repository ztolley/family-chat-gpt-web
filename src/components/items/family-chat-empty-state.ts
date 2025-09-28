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
      color: var(--wa-color-text-quiet);
      padding: var(--wa-space-xs) var(--wa-space-m);
      border: 1px dashed var(--wa-color-surface-border);
      border-radius: var(--wa-panel-border-radius);
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
