import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { Config } from "../config.js";
import { loadUserEmailAndTwoFactor, loadUserMeFields } from "../db/loadUserSafe.js";
import { User, RolePermission } from "../models/index.js";
import { PERMISSION_KEYS } from "../constants/permissions.js";
import {
  issueSecurityOtpChallenge,
  verifyAndConsumeSecurityOtpChallenge,
} from "../services/securityOtpChallenge.js";

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

  r.get("/role-permissions", async (req, res) => {
    const userId = req.userId!;
    try {
      const user = await User.findByPk(userId);
      if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
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
      if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Bulk update: delete all for this role and re-insert
      await RolePermission.destroy({ where: { role } });
      
      const toCreate = permissions.map(pk => ({
        role,
        permissionKey: pk
      }));

      await RolePermission.bulkCreate(toCreate);

      return res.json({ message: `Permissions updated for ${role}` });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}
