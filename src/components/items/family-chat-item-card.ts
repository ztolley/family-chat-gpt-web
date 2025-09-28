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
      display: block;
    }

    .item-card {
      display: flex;
      justify-content: space-between;
      gap: var(--fc-space-md);
      padding: var(--fc-space-md) var(--fc-space-md-tight);
      background: var(--fc-color-bg-item);
      border-radius: var(--fc-radius-md);
      border: 1px solid transparent;
      transition:
        border-color 0.25s ease,
        background 0.25s ease;
    }

    .item-card:hover {
      border-color: var(--fc-color-scroll-thumb);
      background: var(--fc-color-bg-item-hover);
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: var(--fc-space-2xs);
    }

    .item-title {
      margin: 0;
      font-size: var(--fc-font-size-base);
      font-weight: 600;
      color: var(--fc-color-text-strong);
    }

    .item-description {
      margin: 0;
      color: var(--fc-color-text-soft);
      font-size: var(--fc-font-size-sm);
      line-height: var(--fc-line-height-relaxed);
      white-space: pre-line;
    }

    .item-actions {
      display: flex;
      gap: var(--fc-space-xs);
      align-items: center;
      flex-wrap: wrap;
    }

    .item-actions wa-button::part(base) {
      padding: var(--fc-space-2xs) var(--fc-space-sm);
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
    this.dispatchEvent(
      new CustomEvent<Item>("item-edit", {
        detail: this.item,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleDelete() {
    this.dispatchEvent(
      new CustomEvent<Item>("item-delete", {
        detail: this.item,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-item-card": FamilyChatItemCard;
  }
}
