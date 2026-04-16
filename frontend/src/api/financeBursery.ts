import { apiUrl, authHeaders } from "./baseUrl";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function assignBursery(body: {
  studentId: number;
  percentage: number;
  term: string;
}): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl("/api/me/finance/bursery"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<{ ok: boolean }>(res);
}

export async function revokeBursery(studentId: number, term: string): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(`/api/me/finance/bursery/${studentId}`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ term }), // Term is needed to recalculate base fee
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<{ ok: boolean }>(res);
}
