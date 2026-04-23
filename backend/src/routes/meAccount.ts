import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { Config } from "../config.js";
import { loadUserEmailAndTwoFactor, loadUserMeFields } from "../db/loadUserSafe.js";
import { User, RolePermission, UserPermissionOverride } from "../models/index.js";
import { PERMISSION_KEYS } from "../constants/permissions.js";
import {
  issueSecurityOtpChallenge,
  verifyAndConsumeSecurityOtpChallenge,
} from "../services/securityOtpChallenge.js";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const requestPasswordChangeOtpSchema = z.object({});

const confirmPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  otp: z.string().min(4),
});

const requestTwoFactorOtpSchema = z.object({
  enable: z.boolean(),
});

const confirmTwoFactorSchema = z.object({
  enable: z.boolean(),
  otp: z.string().min(4),
});

const updateRolePermissionsSchema = z.object({
  role: z.string().min(1),
  permissions: z.array(z.string()),
});

const updateUserRoleSchema = z.object({
  role: z.string().trim().min(2, "Enter a role").max(50),
});

const permissionOverrideItemSchema = z.object({
  permissionKey: z.enum(PERMISSION_KEYS),
  allowed: z.boolean(),
});

const updateUserPermissionOverridesSchema = z.object({
  overrides: z.array(permissionOverrideItemSchema),
});

const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the user's full name").max(120),
    email: z.string().trim().email("Enter a valid email").max(255),
    role: z.string().trim().min(2, "Enter a role").max(50),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
    if (!STRONG_PASSWORD_REGEX.test(value.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Password must include uppercase, lowercase, number, and symbol characters",
        path: ["password"],
      });
    }
  });

function normalizeRole(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function isAdminRole(role: string): boolean {
  return role === "admin" || role === "super_admin";
}

function effectivePermissionKeys(
  rolePermissionKeys: string[],
  overrides: Array<{ permissionKey: string; allowed: boolean }>,
): string[] {
  const set = new Set(rolePermissionKeys);
  for (const item of overrides) {
    if (item.allowed) set.add(item.permissionKey);
    else set.delete(item.permissionKey);
  }
  return [...set];
}

export function createMeAccountRouter(config: Config) {
  const r = Router();

  r.get("/account", async (req, res) => {
    const userId = req.userId!;
    try {
      const row = await loadUserEmailAndTwoFactor(userId);
      if (!row) {
        return res.status(404).json({ error: "Account not found" });
      }
      return res.json({
        email: row.email,
        twoFactorEnabled: row.twoFactorEnabled,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/security/password-change/request-otp", async (req, res) => {
    const parsed = requestPasswordChangeOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "Account not found" });

      const issued = await issueSecurityOtpChallenge(config, {
        userId,
        email: user.email,
        purpose: "password_change",
      });
      if (!issued.ok) {
        return res.status(503).json({ error: issued.error });
      }
      return res.json({
        message: "Verification code sent to your email.",
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/security/password-change/confirm", async (req, res) => {
    const parsed = confirmPasswordChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid body";
      return res.status(400).json({ error: msg });
    }
    const { currentPassword, newPassword, otp } = parsed.data;
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "Account not found" });

      const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!currentOk) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }

      const otpOk = await verifyAndConsumeSecurityOtpChallenge(
        userId,
        "password_change",
        otp,
      );
      if (!otpOk) {
        return res.status(400).json({
          error: "Invalid or expired verification code.",
        });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await user.update({ passwordHash });
      return res.json({ message: "Password updated successfully." });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/security/two-factor/request-otp", async (req, res) => {
    const parsed = requestTwoFactorOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body" });
    }
    const { enable } = parsed.data;
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "Account not found" });

      if (enable && user.twoFactorEnabled) {
        return res.status(400).json({ error: "Two-factor authentication is already on." });
      }
      if (!enable && !user.twoFactorEnabled) {
        return res.status(400).json({ error: "Two-factor authentication is already off." });
      }

      const purpose = enable ? "two_factor_on" : "two_factor_off";
      const issued = await issueSecurityOtpChallenge(config, {
        userId,
        email: user.email,
        purpose,
      });
      if (!issued.ok) {
        return res.status(503).json({ error: issued.error });
      }
      return res.json({
        message: "Verification code sent to your email.",
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/security/two-factor/confirm", async (req, res) => {
    const parsed = confirmTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body" });
    }
    const { enable, otp } = parsed.data;
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "Account not found" });

      if (enable && user.twoFactorEnabled) {
        return res.status(400).json({ error: "Two-factor authentication is already on." });
      }
      if (!enable && !user.twoFactorEnabled) {
        return res.status(400).json({ error: "Two-factor authentication is already off." });
      }

      const purpose = enable ? "two_factor_on" : "two_factor_off";
      const otpOk = await verifyAndConsumeSecurityOtpChallenge(
        userId,
        purpose,
        otp,
      );
      if (!otpOk) {
        return res.status(400).json({
          error: "Invalid or expired verification code.",
        });
      }

      await user.update({ twoFactorEnabled: enable });
      return res.json({
        twoFactorEnabled: enable,
        message: enable
          ? "Two-factor authentication is now on."
          : "Two-factor authentication is now off.",
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/users", async (req, res) => {
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const users = await User.findAll({
        attributes: [
          "id",
          "fullName",
          "email",
          "phoneNumber",
          "gender",
          "dateOfBirth",
          "addressLine",
          "role",
          "createdAt",
        ],
        order: [["id", "DESC"]],
      });

      return res.json({
        users: users.map((row) => ({
          id: row.id,
          name: row.fullName?.trim() || row.email.split("@")[0],
          email: row.email,
          phoneNumber: row.phoneNumber ?? null,
          gender: row.gender ?? null,
          dateOfBirth: row.dateOfBirth ?? null,
          addressLine: row.addressLine ?? null,
          role: row.role,
          createdAt: row.createdAt,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/users", async (req, res) => {
    const userId = req.userId!;
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid body";
      return res.status(400).json({ error: msg });
    }

    const { name, email, role, password } = parsed.data;
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      return res.status(400).json({ error: "Enter a valid role" });
    }

    try {
      const user = await User.findByPk(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const created = await User.create({
        fullName: name.trim(),
        email: email.trim(),
        role: normalizedRole,
        passwordHash,
      });

      return res.status(201).json({
        user: {
          id: created.id,
          name: created.fullName?.trim() || created.email.split("@")[0],
          email: created.email,
          phoneNumber: created.phoneNumber ?? null,
          gender: created.gender ?? null,
          dateOfBirth: created.dateOfBirth ?? null,
          addressLine: created.addressLine ?? null,
          role: created.role,
          createdAt: created.createdAt,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.patch("/users/:id/role", async (req, res) => {
    const userId = req.userId!;
    const targetUserId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid body";
      return res.status(400).json({ error: msg });
    }
    const normalizedRole = normalizeRole(parsed.data.role);
    if (!normalizedRole || normalizedRole === "pending_assignment") {
      return res.status(400).json({ error: "Enter a valid assigned role" });
    }
    try {
      const actor = await User.findByPk(userId);
      if (!actor || !isAdminRole(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const target = await User.findByPk(targetUserId);
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }
      await target.update({ role: normalizedRole });
      return res.json({
        user: {
          id: target.id,
          name: target.fullName?.trim() || target.email.split("@")[0],
          email: target.email,
          phoneNumber: target.phoneNumber ?? null,
          gender: target.gender ?? null,
          dateOfBirth: target.dateOfBirth ?? null,
          addressLine: target.addressLine ?? null,
          role: target.role,
          createdAt: target.createdAt,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/users/:id/permissions", async (req, res) => {
    const userId = req.userId!;
    const targetUserId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    try {
      const actor = await User.findByPk(userId);
      if (!actor || !isAdminRole(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const target = await User.findByPk(targetUserId);
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      const roleRows = await RolePermission.findAll({
        where: { role: target.role },
        attributes: ["permissionKey"],
      });
      const rolePermissions = roleRows.map((row) => row.permissionKey);
      const overrideRows = await UserPermissionOverride.findAll({
        where: { userId: targetUserId },
        attributes: ["permissionKey", "allowed"],
      });
      const overrides = overrideRows.map((row) => ({
        permissionKey: row.permissionKey,
        allowed: Boolean(row.allowed),
      }));
      const effective = effectivePermissionKeys(rolePermissions, overrides);

      return res.json({
        userId: target.id,
        userRole: target.role,
        availableKeys: PERMISSION_KEYS,
        rolePermissions,
        overrides,
        effectivePermissions: effective,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.put("/users/:id/permissions", async (req, res) => {
    const userId = req.userId!;
    const targetUserId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const parsed = updateUserPermissionOverridesSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid body";
      return res.status(400).json({ error: msg });
    }
    try {
      const actor = await User.findByPk(userId);
      if (!actor || !isAdminRole(actor.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const target = await User.findByPk(targetUserId);
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      const sequelize = UserPermissionOverride.sequelize;
      if (!sequelize) {
        return res.status(500).json({ error: "Database not initialized" });
      }

      const dedup = new Map<string, boolean>();
      for (const item of parsed.data.overrides) {
        dedup.set(item.permissionKey, item.allowed);
      }
      const rows = [...dedup.entries()].map(([permissionKey, allowed]) => ({
        userId: targetUserId,
        permissionKey,
        allowed,
      }));

      await sequelize.transaction(async (t) => {
        await UserPermissionOverride.destroy({ where: { userId: targetUserId }, transaction: t });
        if (rows.length > 0) {
          await UserPermissionOverride.bulkCreate(rows, { transaction: t });
        }
      });

      return res.json({ message: "User permission overrides updated." });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/role-permissions", async (req, res) => {
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const all = await RolePermission.findAll();
      return res.json({
        permissions: all,
        availableKeys: PERMISSION_KEYS,
      });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/role-permissions", async (req, res) => {
    const userId = req.userId!;
    const parsed = updateRolePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body" });
    }

    const { role, permissions } = parsed.data;

    try {
      const user = await User.findByPk(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Bulk update: delete all for this role and re-insert, atomically so
      // a failure mid-way never leaves the role with zero permissions.
      const sequelize = RolePermission.sequelize;
      if (!sequelize) {
        return res.status(500).json({ error: "Database not initialized" });
      }
      const toCreate = permissions.map((pk) => ({
        role,
        permissionKey: pk,
      }));
      await sequelize.transaction(async (t) => {
        await RolePermission.destroy({ where: { role }, transaction: t });
        if (toCreate.length > 0) {
          await RolePermission.bulkCreate(toCreate, { transaction: t });
        }
      });

      return res.json({ message: `Permissions updated for ${role}` });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
