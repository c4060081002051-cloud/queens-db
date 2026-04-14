import { apiUrl, authHeaders } from "./baseUrl";
import type { FinanceDashboardPayload } from "../components/finance/shared/financeTypes";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function fetchFinanceDashboard(month?: string): Promise<FinanceDashboardPayload> {
  const params = new URLSearchParams();
  if (month?.trim()) params.set("month", month.trim());
  const query = params.toString();
  const res = await fetch(apiUrl(`/api/me/finance/dashboard${query ? `?${query}` : ""}`), {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<FinanceDashboardPayload>(res);
}
