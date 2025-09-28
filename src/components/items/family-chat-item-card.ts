import "@awesome.me/webawesome/dist/components/button/button.js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Item } from "@/types";

@customElement("family-chat-item-card")
export class FamilyChatItemCard extends LitElement {
  @property({ type: Object })
  item!: Item;

  @property({ type: Boolean })
  disableActions = false;

  static styles = css`
    :host {
      --color-bg-item: rgba(17, 24, 39, 0.65);
      --color-bg-item-hover: rgba(17, 24, 39, 0.85);
      --color-bg-empty: rgba(8, 12, 23, 0.65);
      --color-scroll-thumb: rgba(99, 102, 241, 0.45);
    }

    .item-card {
      display: flex;
      justify-content: space-between;
      gap: var(--wa-space-m);
      padding: var(--wa-space-m) var(--wa-space-s);
      background: var(--color-bg-item);
      border-radius: var(--wa-panel-border-radius);
      border: 1px solid transparent;
      transition:
        border-color 0.25s ease,
        background 0.25s ease;
    }

    .item-card:hover {
      border-color: var(--color-scroll-thumb);
      background: var(--color-bg-item-hover);
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: var(--wa-space-xs);
    }

    .item-title {
      margin: 0;
      color: var(--wa-color-text-loud);
    }

    .item-description {
      margin: 0;
      color: var(--wa-color-text-quiet);
      font-size: var(--wa-font-size-s);
      line-height: var(--wa-line-height-condensed);
      white-space: pre-line;
    }

    .item-actions {
      display: flex;
      gap: var(--wa-space-s);
      align-items: center;
      flex-wrap: wrap;
    }
  `;

  render() {
    const { item } = this;
    if (!item) {
      return null;
    }

    return html`
      <article class="item-card">
        <div class="item-info">
          <h3 class="item-title">${item.title}</h3>
          ${item.description
            ? html`<p class="item-description">${item.description}</p>`
            : null}
        </div>
        <div class="item-actions">
          <wa-button
            variant="neutral"
            size="small"
            type="button"
            ?disabled=${this.disableActions}
            @click=${this.handleEdit}
          >
            Edit
          </wa-button>
          <wa-button
            variant="danger"
            size="small"
            type="button"
            ?disabled=${this.disableActions}
            @click=${this.handleDelete}
          >
            Delete
          </wa-button>
        </div>
      </article>
    `;
  }

  private handleEdit() {
    // Talk to store direct, not using events
  }

  private handleDelete() {
    // Talk to store direct, not using events
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-item-card": FamilyChatItemCard;
  }
}
