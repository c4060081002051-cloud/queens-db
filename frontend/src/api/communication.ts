import { apiUrl, authHeaders } from "./baseUrl";

async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : null;

  if (!res.ok) {
    throw new Error(data && typeof data === "object" && "error" in data ? data.error ?? "Request failed" : "Request failed");
  }

  return data as T;
}

export type NoticeComment = {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
};

export type NoticeEntry = {
  id: number;
  title: string;
  body: string;
  type: "function" | "assignment" | "general";
  authorLabel: string;
  eventDate: string | null;
  publishedAt: string;
  comments: NoticeComment[];
};

export async function fetchNotices(): Promise<NoticeEntry[]> {
  const data = await fetchApi<{ items: NoticeEntry[] }>("/api/me/communication/notices");
  return data.items;
}

export async function createNotice(payload: {
  title: string;
  body: string;
  type: "function" | "assignment" | "general";
  eventDate?: string;
}): Promise<NoticeEntry> {
  const data = await fetchApi<{ item: NoticeEntry }>("/api/me/communication/notices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function updateNotice(
  id: number,
  payload: Partial<NoticeEntry>,
): Promise<NoticeEntry> {
  const data = await fetchApi<{ item: NoticeEntry }>(`/api/me/communication/notices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function deleteNotice(id: number): Promise<void> {
  await fetchApi(`/api/me/communication/notices/${id}`, { method: "DELETE" });
}

export async function addComment(noticeId: number, body: string): Promise<NoticeComment> {
  const data = await fetchApi<{ item: NoticeComment }>(
    `/api/me/communication/notices/${noticeId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
  return data.item;
}
