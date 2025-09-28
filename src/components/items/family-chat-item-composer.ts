import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/input/input.js";
import "@awesome.me/webawesome/dist/components/textarea/textarea.js";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

interface ComposerPayload {
  title: string;
  description: string;
}

@customElement("family-chat-item-composer")
export class FamilyChatItemComposer extends LitElement {
  @property({ type: Boolean })
  saving = false;

  @query("#item-title")
  private titleInput?: HTMLInputElement;

  @query("#item-description")
  private descriptionInput?: HTMLTextAreaElement;

  static styles = css`
    :host {
      display: block;
      position: sticky;
      bottom: 0;
      margin-top: var(--wa-space-xs);
      padding-top: var(--wa-space-m);
      border-top: 1px solid var(--wa-color-surface-border);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--wa-space-sm);
    }

    .composer-inputs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--wa-space-sm);
    }

    .composer-inputs > * {
      flex-grow: 1;
    }

    .composer-inputs textarea {
      resize: vertical;
    }

    .composer-actions {
      display: flex;
      justify-content: flex-end;
    }

    .composer-actions wa-button::part(base) {
      padding-inline: var(--wa-space-l);
    }

    @media (max-width: 640px) {
      :host {
        padding-top: var(--wa-space-sm);
      }

      .composer-inputs {
        flex-direction: column;
      }

      .composer-inputs input,
      .composer-inputs textarea {
        width: 100%;
      }
    }
  `;

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        <div class="composer-inputs">
          <div>
            <wa-input
              id="item-title"
              type="text"
              placeholder="Add something new…"
              required
            ></wa-input>
          </div>
          <div>
            <wa-textarea
              id="item-description"
              placeholder="Add a note (optional)"
            ></wa-textarea>
          </div>
        </div>
        <div class="composer-actions">
          <wa-button
            type="submit"
            variant="brand"
            size="medium"
            ?loading=${this.saving}
          >
            Add Item
          </wa-button>
        </div>
      </form>
    `;
  }

  resetFields() {
    if (this.titleInput) {
      this.titleInput.value = "";
    }
    if (this.descriptionInput) {
      this.descriptionInput.value = "";
    }
  }

  focusTitle() {
    this.titleInput?.focus();
  }

  private handleSubmit(event: Event) {
    event.preventDefault();

    const title = this.titleInput?.value.trim() ?? "";
    const description = this.descriptionInput?.value.trim() ?? "";

    if (!title) {
      this.focusTitle();
      return;
    }

    const detail: ComposerPayload = {
      title,
      description,
    };

    this.dispatchEvent(
      new CustomEvent<ComposerPayload>("item-submit", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "family-chat-item-composer": FamilyChatItemComposer;
  }
}
