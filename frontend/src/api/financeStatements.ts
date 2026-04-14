import { apiUrl, authHeaders } from "./baseUrl";
import type { StudentStatementPayload } from "../components/finance/shared/financeTypes";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

export async function assignStudentFee(body: {
  studentId: number;
  term: string;
  amountDueUgx: number;
  notes?: string;
}) {
  const res = await fetch(apiUrl("/api/me/finance/fees/assign"), {
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

export async function fetchStudentStatement(
  studentId: number,
  term: string,
): Promise<StudentStatementPayload> {
  const res = await fetch(
    apiUrl(`/api/me/finance/statements/${studentId}?term=${encodeURIComponent(term)}`),
    { headers: { ...authHeaders() } },
  );
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const err = await readJson<{ error?: string }>(res).catch(() => null);
    throw new Error(err?.error ?? "Request failed");
  }
  const data = await readJson<{ item: StudentStatementPayload }>(res);
  return data.item;
}
