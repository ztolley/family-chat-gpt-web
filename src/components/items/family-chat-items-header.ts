import "@awesome.me/webawesome/dist/components/badge/badge.js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("family-chat-items-header")
export class FamilyChatItemsHeader extends LitElement {
  @property({ type: Number })
  count = 0;

  @property({ type: String })
  heading = "Shared Items";

  @property({ type: String })
  description = "Keep everyone aligned on upcoming tasks and plans.";

  static styles = css`
    :host {
      display: block;
      border-bottom: 1px solid var(--wa-color-surface-border);
      padding-bottom: var(--wa-space-m);
    }

    .items-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--wa-space-m);
    }

    .items-heading {
      display: flex;
      flex-direction: column;
      gap: var(--wa-space-xs);
    }

    .items-heading h2 {
      margin: 0;
      font-size: var(--wa-font-size-l);
      font-weight: var(--wa-font-weight-bold);
    }

    .items-heading p {
      margin: 0;
      color: var(--wa-color-text-quiet);
      font-size: var(--wa-font-size-s);
    }

    @media (max-width: 640px) {
      :host {
        padding-bottom: var(--wa-font-size-s);
      }
    }
  `;

  render() {
    const suffix = this.count === 1 ? "" : "s";

    return html`
      <header class="items-header">
        <div class="items-heading">
          <h2>${this.heading}</h2>
          <p>${this.description}</p>
        </div>
        <wa-badge appearance="outlined" variant="neutral"
          >${this.count} item${suffix}</wa-badge
        >
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-items-header": FamilyChatItemsHeader;
  }
}
