import { apiUrl, authHeaders } from "./baseUrl";
import type { FinanceReportRow } from "../components/finance/shared/financeTypes";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function fetchDailyFinanceReports(limit = 30): Promise<FinanceReportRow[]> {
  const res = await fetch(apiUrl(`/api/me/finance/reports/daily?limit=${limit}`), {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  const data = await readJson<{ items: FinanceReportRow[] }>(res);
  return data.items;
}

async function postAction(path: string, body?: unknown) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body ?? {}),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  return readJson<{ ok: boolean }>(res);
}

export function submitDailyReport(reportDate: string) {
  return postAction("/api/me/finance/reports/daily/submit", { reportDate });
}

export function takeReportForReview(id: number) {
  return postAction(`/api/me/finance/reports/daily/${id}/take-review`);
}

export function closeDailyReport(id: number, adminNotes: string) {
  return postAction(`/api/me/finance/reports/daily/${id}/close`, { adminNotes });
}

export function reopenDailyReport(id: number, reason: string) {
  return postAction(`/api/me/finance/reports/daily/${id}/reopen`, { reason });
}
