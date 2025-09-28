import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { effect } from "@preact/signals-core";
import {
  authTokenSignal,
  isAuthenticatedSignal,
} from "@/services/authProvider";
import { createItem, listItems } from "@/services/itemsService";
import type { Item } from "@/types";
import type { FamilyChatItemComposer } from "./family-chat-item-composer";

const SignalElement = SignalWatcher(LitElement) as typeof LitElement;

@customElement("family-chat-items")
export class FamilyChatItems extends SignalElement {
  @state() private authToken: string | null = null;
  @state() private items: Item[] = [];
  @state() private loading = false;
  @state() private saving = false;

  @query("family-chat-item-composer")
  private composer?: FamilyChatItemComposer;

  private disposeEffect?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.disposeEffect = effect(() => {
      const token = authTokenSignal.value;
      if (token !== this.authToken) {
        this.handleTokenChange(token);
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.disposeEffect?.();
  }

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
      gap: var(--wa-space-m);
      padding: var(--wa-space-xl);
    }

    .items-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--wa-space-s);
    }

    @media (max-width: 640px) {
      .items-shell {
        padding: var(--wa-space-m);
      }
    }
  `;

  render() {
    if (!isAuthenticatedSignal.value || !this.authToken) {
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

  private async handleTokenChange(token: string | null) {
    this.authToken = token;
    this.items = [];
    this.loading = false;
    this.saving = false;

    if (!token) {
      return;
    }

    await this.loadItems(token);
  }

  private async loadItems(token: string) {
    this.loading = true;
    try {
      this.items = await listItems(token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load items.";
      console.error(message);
    } finally {
      this.loading = false;
    }
  }

  private async handleComposerSubmit(
    event: CustomEvent<{ title: string; description: string }>,
  ) {
    const token = this.authToken;
    if (!token) {
      return;
    }

    const title = event.detail.title.trim();
    const description = event.detail.description.trim();

    if (!title) {
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

      await this.loadItems(token);
    } catch (error) {
      console.error(error);
    } finally {
      this.saving = false;
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
        html`<family-chat-item-card .item=${item}></family-chat-item-card>`,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-items": FamilyChatItems;
  }
}
