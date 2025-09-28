import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("status-banner")
export class StatusBanner extends LitElement {
  @property({ type: String }) message: string | null = null;
  @property({ type: String }) type: "" | "error" | "success" = "";

  static styles = css`
    :host {
      display: block;
      pointer-events: none;
    }

    .banner {
      padding: 0.85rem 1.15rem;
      border-radius: 12px;
      font-size: 0.95rem;
      background: var(--wa-color-surface-raised, #ffffff);
      box-shadow: var(--wa-shadow-m, 0 14px 36px rgba(15, 23, 42, 0.14));
      border: 1px solid transparent;
      color: var(--wa-color-text-normal, #1f2933);
    }

    .banner.error {
      border-color: var(--wa-color-danger-400, #f87171);
      color: var(--wa-color-danger-600, #dc2626);
      background: rgba(248, 113, 113, 0.15);
    }

    .banner.success {
      border-color: var(--wa-color-success-400, #34d399);
      color: var(--wa-color-success-700, #047857);
      background: rgba(52, 211, 153, 0.15);
    }
  `;

  render() {
    if (!this.message) {
      return html``;
    }

    return html`<div class="banner ${this.type}">${this.message}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "status-banner": StatusBanner;
  }
}
