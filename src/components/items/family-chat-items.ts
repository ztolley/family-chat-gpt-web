import { LitElement, css, html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { customElement, query, state } from "lit/decorators.js";
import { authProvider, type AuthState } from "@/services/authProvider";
import {
  createItem,
  deleteItem,
  listItems,
  updateItem,
} from "@/services/itemsService";
import type { Item, StatusType } from "@/types";
import "../family-chat-empty-state";
import "./family-chat-item-card";
import "./family-chat-item-composer";
import "./family-chat-items-header";
import type { FamilyChatItemComposer } from "./family-chat-item-composer";

@customElement("family-chat-items")
export class FamilyChatItems extends LitElement {
  @state() private authToken: string | null = null;
  @state() private items: Item[] = [];
  @state() private loading = false;
  @state() private saving = false;

  @query("family-chat-item-composer")
  private composer?: FamilyChatItemComposer;

  private unsubscribeAuth?: () => void;

  static styles = css`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .items-shell {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: var(--fc-space-md-plus);
      padding: var(--fc-space-xl);
      border-radius: var(--fc-radius-lg);
      background: var(--fc-color-bg-panel);
      box-shadow: var(--fc-shadow-panel);
      border: 1px solid var(--fc-color-border-accent);
    }

    .items-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--fc-space-sm-plus);
      padding-right: var(--fc-space-3xs);
    }

    .items-list::-webkit-scrollbar {
      width: var(--fc-size-scrollbar);
    }

    .items-list::-webkit-scrollbar-thumb {
      background: var(--fc-color-scroll-thumb);
      border-radius: 999px;
    }

    @media (max-width: 640px) {
      .items-shell {
        padding: var(--fc-space-md-plus);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeAuth = authProvider.subscribe(this.handleAuthChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribeAuth?.();
  }

  render() {
    if (!this.authToken) {
      return nothing;
    }

    return html`
      <section class="items-shell">
        <family-chat-items-header
          .count=${this.items.length}
        ></family-chat-items-header>

        <div class="items-list">${this.renderItems()}</div>

        <family-chat-item-composer
          .saving=${this.saving}
          @item-submit=${this.handleComposerSubmit}
        ></family-chat-item-composer>
      </section>
    `;
  }

  private handleAuthChange = (state: AuthState) => {
    const previousToken = this.authToken;
    this.authToken = state.token;

    if (!this.authToken) {
      this.items = [];
      this.loading = false;
      this.saving = false;
      return;
    }

    if (this.authToken !== previousToken) {
      void this.loadItems();
    }
  };

  private async loadItems() {
    const token = this.authToken;
    if (!token) {
      return;
    }

    this.loading = true;
    try {
      this.items = await listItems(token);
      this.dispatchStatus("Items loaded.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load items.";
      this.dispatchStatus(message, "error");
    } finally {
      this.loading = false;
    }
  }

  private async handleComposerSubmit(
    event: CustomEvent<{ title: string; description: string }>,
  ) {
    const token = this.authToken;
    if (!token) {
      this.dispatchStatus("Not authenticated.", "error");
      return;
    }

    const title = event.detail.title.trim();
    const description = event.detail.description.trim();

    if (!title) {
      this.dispatchStatus("Please provide a title.", "error");
      this.composer?.focusTitle();
      return;
    }

    this.saving = true;
    try {
      await createItem(token, {
        title,
        description: description || undefined,
      });
      this.composer?.resetFields();
      this.dispatchStatus("Item added.", "success");
      await this.loadItems();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add item.";
      this.dispatchStatus(message, "error");
    } finally {
      this.saving = false;
    }
  }

  private async handleItemEdit(event: CustomEvent<Item>) {
    const item = event.detail;
    const token = this.authToken;
    if (!token) {
      this.dispatchStatus("Not authenticated.", "error");
      return;
    }

    const newTitle = prompt("Update the item title", item.title);
    if (newTitle === null) {
      return;
    }

    const newDescription = prompt(
      "Update the description (optional)",
      item.description ?? "",
    );

    try {
      this.dispatchStatus("Saving changes…");
      await updateItem(token, item.id, {
        title: newTitle.trim(),
        description: newDescription?.trim() || undefined,
      });
      this.dispatchStatus("Item updated.", "success");
      await this.loadItems();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update item.";
      this.dispatchStatus(message, "error");
    }
  }

  private async handleItemDelete(event: CustomEvent<Item>) {
    const item = event.detail;
    const token = this.authToken;
    if (!token) {
      this.dispatchStatus("Not authenticated.", "error");
      return;
    }

    const confirmed = confirm("Delete this item?");
    if (!confirmed) {
      return;
    }

    try {
      this.dispatchStatus("Deleting item…");
      await deleteItem(token, item.id);
      this.dispatchStatus("Item deleted.", "success");
      await this.loadItems();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete item.";
      this.dispatchStatus(message, "error");
    }
  }

  private renderItems() {
    if (this.loading) {
      return html`<family-chat-empty-state
        message="Loading items…"
      ></family-chat-empty-state>`;
    }

    if (!this.items.length) {
      return html`<family-chat-empty-state
        message="No items yet."
      ></family-chat-empty-state>`;
    }

    return repeat(
      this.items,
      (item) => item.id,
      (item) =>
        html`<family-chat-item-card
          .item=${item}
          @item-edit=${this.handleItemEdit}
          @item-delete=${this.handleItemDelete}
        ></family-chat-item-card>`,
    );
  }

  private dispatchStatus(message: string | null, type: StatusType = "") {
    this.dispatchEvent(
      new CustomEvent("items-status", {
        detail: { message, type },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-items": FamilyChatItems;
  }
}
