import type { Item } from "@/types";

const API_BASE = "/api";

type RequestOptions = RequestInit & { expectBody?: boolean };

async function authorizedRequest<T>(
  token: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { expectBody = true, ...init } = options;
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { error?: string });
    const message = body.error || response.statusText;
    throw new Error(message);
  }

  if (!expectBody || response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listItems(token: string): Promise<Item[]> {
  return authorizedRequest<Item[]>(token, "/items");
}

export async function createItem(
  token: string,
  payload: { title: string; description?: string | null },
): Promise<Item> {
  return authorizedRequest<Item>(token, "/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateItem(
  token: string,
  id: string,
  payload: { title?: string; description?: string | null },
): Promise<Item> {
  return authorizedRequest<Item>(token, `/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteItem(token: string, id: string): Promise<void> {
  await authorizedRequest<void>(token, `/items/${id}`, {
    method: "DELETE",
    expectBody: false,
  });
}
