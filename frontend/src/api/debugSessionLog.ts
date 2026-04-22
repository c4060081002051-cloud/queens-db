import { apiUrl, authHeaders } from "./baseUrl";

/** Writes one NDJSON line to repo `debug-d76cee.log` via dev-only backend endpoint. */
export function debugClientLog(payload: Record<string, unknown>): void {
  if (import.meta.env.PROD) return;
  void fetch(apiUrl("/api/me/settings/debug-client-log"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sessionId: "d76cee", ...payload, timestamp: Date.now() }),
  }).catch(() => {});
}
