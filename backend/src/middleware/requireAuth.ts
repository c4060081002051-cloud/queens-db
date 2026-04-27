import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Config } from "../config.js";
import { User } from "../models/index.js";

export function requireAuth(config: Config): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload & {
        sub: string;
      };
      const id = Number.parseInt(payload.sub, 10);
      if (!Number.isFinite(id) || id < 1) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await User.findByPk(id, { attributes: ["id", "isActive", "isDeleted"] });
      if (!user || user.isDeleted || !user.isActive) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.userId = id;
      return next();
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}
