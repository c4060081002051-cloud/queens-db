import { z } from "zod";
import "dotenv/config";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters (use a random string)"),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("queensdb"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  /**
   * Resend API (same idea as learningSystem user.controller.js). If set, password-reset email uses Resend
   * instead of SMTP below.
   */
  RESEND_API_KEY: z.string().default(""),
  /** e.g. "Queens Junior School <onboarding@resend.dev>" — use a domain you verify in Resend for production */
  RESEND_FROM: z.string().default(""),
  /** Optional — classic SMTP when RESEND_API_KEY is empty */
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default(""),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}
