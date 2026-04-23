import { apiUrl, authHeaders } from "./baseUrl";

/** 
 * Note: In a real app, we would have a proper API route for this.
 * For now, we'll use the /api/me/role-permissions endpoint we just created.
 */

export type RolePermissionMapping = {
  id: number;
  role: string;
  permissionKey: string;
};

export type RolePermissionsResponse = {
  permissions: RolePermissionMapping[];
  availableKeys: string[];
};

export type UserPermissionOverride = {
  permissionKey: string;
  allowed: boolean;
};

export type UserPermissionsResponse = {
  userId: number;
  userRole: string;
  availableKeys: string[];
  rolePermissions: string[];
  overrides: UserPermissionOverride[];
  effectivePermissions: string[];
};

export async function fetchRolePermissions(): Promise<RolePermissionsResponse> {
  const requestUrl = apiUrl("/api/me/role-permissions");
  const headers = authHeaders();
  // #region agent log
  fetch('http://127.0.0.1:7413/ingest/299b84ae-e9b2-45ce-b53d-28789819d44d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'78b361'},body:JSON.stringify({sessionId:'78b361',runId:'post-fix',hypothesisId:'H7',location:'frontend/src/api/settings.ts:22',message:'fetch_role_permissions_request',data:{requestUrl,hasAuthHeader:Boolean(headers.Authorization)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const res = await fetch(requestUrl, {
    headers,
  });
  const contentType = res.headers.get("content-type");
  const responseText = await res.text();
  // #region agent log
  fetch('http://127.0.0.1:7413/ingest/299b84ae-e9b2-45ce-b53d-28789819d44d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'78b361'},body:JSON.stringify({sessionId:'78b361',runId:'baseline',hypothesisId:'H8',location:'frontend/src/api/settings.ts:30',message:'fetch_role_permissions_response',data:{status:res.status,ok:res.ok,contentType,responsePreview:responseText.slice(0,120)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!res.ok) throw new Error("Failed to fetch permissions");
  try {
    return JSON.parse(responseText);
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7413/ingest/299b84ae-e9b2-45ce-b53d-28789819d44d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'78b361'},body:JSON.stringify({sessionId:'78b361',runId:'baseline',hypothesisId:'H9',location:'frontend/src/api/settings.ts:35',message:'fetch_role_permissions_parse_failed',data:{error:err instanceof Error ? err.message : 'unknown',contentType,responsePreview:responseText.slice(0,120)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }
}

export async function updateRolePermissions(role: string, permissions: string[]): Promise<void> {
  const res = await fetch(apiUrl("/api/me/role-permissions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ role, permissions }),
  });
  if (!res.ok) throw new Error("Failed to update permissions");
}

export async function fetchUserPermissions(userId: number): Promise<UserPermissionsResponse> {
  const res = await fetch(apiUrl(`/api/me/users/${userId}/permissions`), {
    headers: {
      ...authHeaders(),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || "Failed to load user permissions");
  }
  return JSON.parse(text) as UserPermissionsResponse;
}

export async function updateUserPermissionOverrides(
  userId: number,
  overrides: UserPermissionOverride[],
): Promise<void> {
  const res = await fetch(apiUrl(`/api/me/users/${userId}/permissions`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ overrides }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update user permissions");
  }
}
