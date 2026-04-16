import { Router } from "express";
import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import type { Config } from "../config.js";
import { ensureSecuritySchema } from "../db/ensureSecuritySchema.js";
import { loadUserMeFields } from "../db/loadUserSafe.js";
import { User, userByEmailCi } from "../models/index.js";
import {
  issueSecurityOtpChallenge,
  verifyAndConsumeSecurityOtpChallenge,
} from "../services/securityOtpChallenge.js";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  /** When true, issue a longer-lived JWT (same as “Remember me” on the client). */
  rememberMe: z.boolean().optional(),
});

const verify2faSchema = z.object({
  twoFactorToken: z.string().min(10),
  otp: z.string().min(4),
});

/** Valid bcrypt hash so unknown emails still pay compare cost */
const DUMMY_HASH =
  "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G7.i1bq7QE.BG";

export function createAuthRouter(config: Config) {
  const r = Router();

  r.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Enter your email and password.",
      });
    }

    const { email, password, rememberMe } = parsed.data;
    const normalized = email.trim();

    let hashToCompare = DUMMY_HASH;
    let user: InstanceType<typeof User> | null = null;

    try {
      const found = await userByEmailCi(normalized);
      if (found) {
        hashToCompare = found.passwordHash;
        user = found;
      }
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }

    const ok = await bcrypt.compare(password, hashToCompare);
    if (!ok || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.twoFactorEnabled) {
      const issued = await issueSecurityOtpChallenge(config, {
        userId: user.id,
        email: user.email,
        purpose: "login_2fa",
      });
      if (!issued.ok) {
        return res.status(503).json({ error: issued.error });
      }
      const twoFactorToken = jwt.sign(
        {
          tfPending: true,
          sub: String(user.id),
          email: user.email,
          role: user.role,
          remember: Boolean(rememberMe),
        },
        config.JWT_SECRET,
        { expiresIn: "10m" },
      );
      return res.json({ requiresTwoFactor: true, twoFactorToken });
    }

    const expiresIn = rememberMe ? "30d" : "7d";
    const token = jwt.sign(
      { sub: String(user.id), role: user.role, email: user.email },
      config.JWT_SECRET,
      { expiresIn },
    );

    return res.json({ token });
  });

  r.post("/verify-login-2fa", async (req, res) => {
    const parsed = verify2faSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Enter the verification code." });
    }
    const { twoFactorToken, otp } = parsed.data;

    let payload: JwtPayload & {
      tfPending?: boolean;
      sub?: string;
      email?: string;
      role?: string;
      remember?: boolean;
    };
    try {
      payload = jwt.verify(twoFactorToken, config.JWT_SECRET) as typeof payload;
    } catch {
      return res.status(400).json({
        error: "Sign-in session expired. Please sign in again.",
      });
    }

    if (!payload.tfPending || typeof payload.sub !== "string") {
      return res.status(400).json({ error: "Invalid sign-in session." });
    }

    const userId = Number.parseInt(payload.sub, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid sign-in session." });
    }

    try {
      const otpOk = await verifyAndConsumeSecurityOtpChallenge(
        userId,
        "login_2fa",
        otp,
      );
      if (!otpOk) {
        return res.status(400).json({
          error: "Invalid or expired verification code.",
        });
      }

      const row = await User.findByPk(userId);
      if (!row || row.email !== payload.email) {
        return res.status(400).json({ error: "Invalid sign-in session." });
      }

      const expiresIn = payload.remember ? "30d" : "7d";
      const token = jwt.sign(
        { sub: String(row.id), role: row.role, email: row.email },
        config.JWT_SECRET,
        { expiresIn },
      );
      return res.json({ token });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.get("/me", async (req, res) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload & {
        sub: string;
        role: string;
        email: string;
      };
      const id = Number.parseInt(payload.sub, 10);
      if (!Number.isFinite(id)) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const jwtFallback = {
        email: payload.email,
        role: payload.role,
      };
      let fields: Awaited<ReturnType<typeof loadUserMeFields>>;
      try {
        fields = await loadUserMeFields(id, jwtFallback);
      } catch (err) {
        console.error("[auth/me] load user failed; re-running security schema DDL…", err);
        try {
          await ensureSecuritySchema(User.sequelize!);
          fields = await loadUserMeFields(id, jwtFallback);
        } catch (err2) {
          console.error(err2);
          return res.status(503).json({ error: "Database unavailable" });
        }
      }
      return res.json({
        user: {
          sub: payload.sub,
          email: fields.email,
          role: fields.role,
          twoFactorEnabled: fields.twoFactorEnabled,
          permissions: fields.permissions,
        },
      });
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  });

  return r;
}
