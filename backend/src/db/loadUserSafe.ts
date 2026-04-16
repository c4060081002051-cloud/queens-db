import { User, RolePermission } from "../models/index.js";

function isUnknownTwoFactorColumnError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? "");
  if (msg.includes("Unknown column") && msg.includes("two_factor_enabled")) {
    return true;
  }
  const errno = (e as { parent?: { errno?: number } })?.parent?.errno;
  /** MySQL ER_BAD_FIELD_ERROR */
  return errno === 1054 && msg.includes("two_factor_enabled");
}

/**
 * Load email / role / 2FA flag even if `users.two_factor_enabled` is missing (legacy DB).
 */
export async function loadUserMeFields(
  userId: number,
  jwtFallback: { email: string; role: string },
): Promise<{ email: string; role: string; twoFactorEnabled: boolean; permissions: string[] }> {
  try {
    const row = await User.findByPk(userId, {
      attributes: ["email", "role", "twoFactorEnabled"],
    });
    const email = row?.email ?? jwtFallback.email;
    const role = row?.role ?? jwtFallback.role;
    
    const perms = await RolePermission.findAll({ where: { role } });
    const permissions = perms.map(p => p.permissionKey);

    return {
      email,
      role,
      twoFactorEnabled: Boolean(row?.twoFactorEnabled),
      permissions
    };
  } catch (e) {
    if (!isUnknownTwoFactorColumnError(e)) throw e;
    const row = await User.findByPk(userId, {
      attributes: ["email", "role"],
    });
    const email = row?.email ?? jwtFallback.email;
    const role = row?.role ?? jwtFallback.role;

    const perms = await RolePermission.findAll({ where: { role } });
    const permissions = perms.map(p => p.permissionKey);

    return {
      email,
      role,
      twoFactorEnabled: false,
      permissions
    };
  }
}

export async function loadUserEmailAndTwoFactor(
  userId: number,
): Promise<{ email: string; twoFactorEnabled: boolean } | null> {
  try {
    const row = await User.findByPk(userId, {
      attributes: ["email", "twoFactorEnabled"],
    });
    if (!row) return null;
    return {
      email: row.email,
      twoFactorEnabled: Boolean(row.twoFactorEnabled),
    };
  } catch (e) {
    if (!isUnknownTwoFactorColumnError(e)) throw e;
    const row = await User.findByPk(userId, {
      attributes: ["email"],
    });
    if (!row) return null;
    return { email: row.email, twoFactorEnabled: false };
  }
}
