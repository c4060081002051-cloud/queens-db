import { apiUrl, authHeaders } from "./baseUrl";
import type { FinanceLedgerPayload } from "../components/finance/shared/financeTypes";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function fetchFinanceLedger(date: string): Promise<FinanceLedgerPayload> {
  const res = await fetch(apiUrl(`/api/me/finance/ledger?date=${encodeURIComponent(date)}`), {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<FinanceLedgerPayload>(res);
}

export async function createDailyExpense(body: {
  expenseDate: string;
  category: string;
  description: string;
  paymentMethod: string;
  amountUgx: number;
}) {
  const res = await fetch(apiUrl("/api/me/finance/ledger/expenses"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<{ item: { id: number } }>(res);
}
