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
  const res = await fetch(requestUrl, {
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch permissions");
  return res.json();
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

export async function updateRolePermissionsBulk(updates: { role: string; permissions: string[] }[]): Promise<void> {
  const res = await fetch(apiUrl("/api/me/role-permissions/bulk"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error("Failed to update bulk permissions");
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
