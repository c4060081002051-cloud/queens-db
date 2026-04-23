import { apiUrl, authHeaders } from "./baseUrl";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

async function errorMessageFromResponse(res: Response): Promise<string> {
  const text = await res.text();
  if (!text.trim()) {
    return `Request failed (${res.status})`;
  }
  try {
    const j = JSON.parse(text) as { error?: string };
    return j.error ?? `Request failed (${res.status})`;
  } catch {
    return text.trim().slice(0, 200);
  }
}

export type AccountInfo = {
  email: string;
  twoFactorEnabled: boolean;
};

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  addressLine: string | null;
  role: string;
  createdAt: string;
};

export async function fetchAccount(): Promise<AccountInfo> {
  const res = await fetch(apiUrl("/api/me/account"), { headers: { ...authHeaders() } });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  return readJson<AccountInfo>(res);
}

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const res = await fetch(apiUrl("/api/me/users"), { headers: { ...authHeaders() } });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  const data = await readJson<{ users: ManagedUser[] }>(res);
  return data.users;
}

export async function createManagedUser(body: {
  name: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
}): Promise<ManagedUser> {
  const res = await fetch(apiUrl("/api/me/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  const data = await readJson<{ user: ManagedUser }>(res);
  return data.user;
}

export async function updateManagedUserRole(
  userId: number,
  role: string,
): Promise<ManagedUser> {
  const res = await fetch(apiUrl(`/api/me/users/${userId}/role`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  const data = await readJson<{ user: ManagedUser }>(res);
  return data.user;
}

export async function requestPasswordChangeOtp(): Promise<void> {
  const res = await fetch(apiUrl("/api/me/security/password-change/request-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({}),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
}

export async function confirmPasswordChange(body: {
  currentPassword: string;
  newPassword: string;
  otp: string;
}): Promise<void> {
  const res = await fetch(apiUrl("/api/me/security/password-change/confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
}

export async function requestTwoFactorOtp(enable: boolean): Promise<void> {
  const res = await fetch(apiUrl("/api/me/security/two-factor/request-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ enable }),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
}

export async function confirmTwoFactor(enable: boolean, otp: string): Promise<boolean> {
  const res = await fetch(apiUrl("/api/me/security/two-factor/confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ enable, otp }),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res));
  }
  const data = await readJson<{ twoFactorEnabled: boolean }>(res);
  return data.twoFactorEnabled;
}
