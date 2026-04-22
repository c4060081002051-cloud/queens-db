import { apiUrl, authHeaders } from "./baseUrl";
import { debugClientLog } from "./debugSessionLog";

export async function fetchGeneralSettings(): Promise<Record<string, string>> {
  const requestUrl = apiUrl("/api/me/settings/general");
  const headers = authHeaders();

  let res: Response;
  try {
    res = await fetch(requestUrl, { headers });
  } catch (netErr) {
    // #region agent log
    debugClientLog({
      hypothesisId: "H2",
      location: "settingsGeneral.ts:fetchGeneralSettings:network",
      message: "fetch_settings_network_error",
      data: {
        requestUrl,
        hasAuthHeader: Boolean(headers.Authorization),
        errName: netErr instanceof Error ? netErr.name : "unknown",
      },
    });
    // #endregion
    throw new Error(
      "Cannot reach the API. Start the backend (e.g. npm run dev:backend) and ensure MySQL is running.",
    );
  }

  const text = await res.text();
  // #region agent log
  debugClientLog({
    hypothesisId: "H2",
    location: "settingsGeneral.ts:fetchGeneralSettings:response",
    message: "fetch_settings_http",
    data: {
      requestUrl,
      status: res.status,
      ok: res.ok,
      hasAuthHeader: Boolean(headers.Authorization),
      bodyPreviewLen: text.length,
    },
  });
  // #endregion
  if (!res.ok) {
    let detail = text;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* use raw text */
    }
    if (res.status === 401) {
      throw new Error("Session expired or not signed in. Please log in again.");
    }
    if (res.status === 403) {
      throw new Error("You do not have access to general settings.");
    }
    throw new Error(detail || `Failed to load settings (${res.status}).`);
  }

  try {
    const parsed = JSON.parse(text) as Record<string, string>;
    // #region agent log
    debugClientLog({
      hypothesisId: "H5",
      location: "settingsGeneral.ts:fetchGeneralSettings:parsed",
      message: "fetch_settings_json_ok",
      data: { keysReturned: Object.keys(parsed).length },
    });
    // #endregion
    return parsed;
  } catch {
    // #region agent log
    debugClientLog({
      hypothesisId: "H5",
      location: "settingsGeneral.ts:fetchGeneralSettings:parse_fail",
      message: "fetch_settings_json_invalid",
      data: { bodyPreviewLen: text.length },
    });
    // #endregion
    throw new Error("Invalid settings response from server.");
  }
}

export async function saveGeneralSettings(settings: Record<string, string>): Promise<{ message: string; settings: Record<string, string> }> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/me/settings/general"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ settings }),
    });
  } catch {
    throw new Error("Cannot reach the API. Check that the backend is running.");
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = `Failed to save settings (${res.status}).`;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* use default msg */
    }
    throw new Error(msg);
  }
  return JSON.parse(text) as { message: string; settings: Record<string, string> };
}
