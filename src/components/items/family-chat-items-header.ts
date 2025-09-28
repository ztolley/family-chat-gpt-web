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
      border-bottom: 1px solid var(--fc-color-border-subtle);
      padding-bottom: var(--fc-space-md);
    }

    .items-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--fc-space-md);
    }

    .items-heading {
      display: flex;
      flex-direction: column;
      gap: var(--fc-space-2xs);
    }

    .items-heading h2 {
      margin: 0;
      font-size: var(--fc-font-size-lg);
      font-weight: 600;
    }

    .items-heading p {
      margin: 0;
      color: var(--fc-color-text-secondary);
      font-size: var(--fc-font-size-sm);
    }

    .items-count {
      font-size: var(--fc-font-size-xs);
      background: var(--fc-color-accent-soft);
      color: var(--fc-color-text-badge);
      padding: var(--fc-space-2xs) var(--fc-space-sm-inline);
      border-radius: 999px;
      font-weight: 600;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      :host {
        padding-bottom: var(--fc-space-sm);
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
        <span class="items-count">${this.count} item${suffix}</span>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-items-header": FamilyChatItemsHeader;
  }
}
