import { apiUrl, authHeaders } from "./baseUrl";
import type { DebtorsPayload } from "../components/finance/shared/financeTypes";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function fetchDebtorsReport(term?: string): Promise<DebtorsPayload> {
  const query = term ? `?term=${encodeURIComponent(term)}` : "";
  const res = await fetch(apiUrl(`/api/me/finance/reports/debtors${query}`), {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<DebtorsPayload>(res);
}
