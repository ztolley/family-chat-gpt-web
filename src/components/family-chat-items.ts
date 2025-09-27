import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import type { Item, StatusType } from "@/types";
import { authProvider, type AuthState } from "@/services/authProvider";
import {
  createItem,
  deleteItem,
  listItems,
  updateItem,
} from "@/services/itemsService";

@customElement("family-chat-items")
export class FamilyChatItems extends LitElement {
  @state() private authToken: string | null = null;
  @state() private userEmail: string | null = null;
  @state() private items: Item[] = [];
  @state() private loading = false;
  @state() private saving = false;

  @query("#item-title")
  private itemTitleInput?: HTMLInputElement;

  @query("#item-description")
  private itemDescriptionInput?: HTMLInputElement;

  private unsubscribeAuth?: () => void;

  static styles = css`
    :host {
      display: block;
    }

    section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .user-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .user-info sl-button::part(base) {
      color: #2563eb;
    }

    form {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    form input {
      flex: 1 1 220px;
      padding: 0.65rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }

    form sl-button::part(base) {
      height: 100%;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .item-actions {
      display: flex;
      gap: 0.5rem;
    }

    .item-actions sl-button::part(base) {
      padding: 0.35rem 0.75rem;
    }

    .empty-state {
      text-align: center;
      color: #64748b;
    }

    @media (max-width: 600px) {
      section {
        padding: 1.5rem 1rem;
      }

      form {
        flex-direction: column;
      }

      form input {
        width: 100%;
      }

      form sl-button::part(base) {
        width: 100%;
      }

      .item {
        flex-direction: column;
        align-items: flex-start;
      }

      .item-actions {
        width: 100%;
        justify-content: flex-end;
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
      <section>
        <div class="user-info">
          <span>
            Signed in as
            <strong>${this.userEmail ?? "Unknown user"}</strong>
          </span>
          <sl-button
            variant="text"
            size="small"
            type="button"
            @click=${this.handleLogoutClick}
          >
            Log out
          </sl-button>
        </div>
        <form @submit=${this.handleSubmit}>
          <input
            id="item-title"
            type="text"
            placeholder="Item title"
            required
          />
          <input
            id="item-description"
            type="text"
            placeholder="Description (optional)"
          />
          <sl-button type="submit" variant="primary" ?loading=${this.saving}>
            Add Item
          </sl-button>
        </form>
        <ul>
          ${this.renderItems()}
        </ul>
      </section>
    `;
  }

  focusForm() {
    this.itemTitleInput?.focus();
  }

  resetForm() {
    if (this.itemTitleInput) {
      this.itemTitleInput.value = "";
    }
    if (this.itemDescriptionInput) {
      this.itemDescriptionInput.value = "";
    }
  }

  private handleAuthChange = (state: AuthState) => {
    const previousToken = this.authToken;
    this.authToken = state.token;
    this.userEmail = state.profile?.email ?? null;

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

  private async handleSubmit(event: Event) {
    event.preventDefault();

    const token = this.authToken;
    if (!token) {
      this.dispatchStatus("Not authenticated.", "error");
      return;
    }

    const title = this.itemTitleInput?.value.trim() ?? "";
    const description = this.itemDescriptionInput?.value.trim() ?? "";

    if (!title) {
      this.dispatchStatus("Please provide a title.", "error");
      this.focusForm();
      return;
    }

    this.saving = true;
    try {
      await createItem(token, {
        title,
        description: description || undefined,
      });
      this.resetForm();
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

  private handleLogoutClick() {
    authProvider.logout();
    this.dispatchStatus("Signed out.");
  }

  private async handleEditClick(item: Item) {
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

  private async handleDeleteClick(item: Item) {
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
      return html`<li class="empty-state">Loading items…</li>`;
    }

    if (!this.items.length) {
      return html`<li class="empty-state">No items yet.</li>`;
    }

    return this.items.map(
      (item) => html`
        <li class="item">
          <div class="item-info">
            <strong>${item.title}</strong>
            ${item.description
              ? html`<span>${item.description}</span>`
              : nothing}
          </div>
          <div class="item-actions">
            <sl-button
              variant="warning"
              size="small"
              type="button"
              @click=${() => this.handleEditClick(item)}
            >
              Edit
            </sl-button>
            <sl-button
              variant="danger"
              size="small"
              type="button"
              @click=${() => this.handleDeleteClick(item)}
            >
              Delete
            </sl-button>
          </div>
        </li>
      `,
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
