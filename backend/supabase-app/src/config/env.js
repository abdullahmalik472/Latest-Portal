import "dotenv/config";
import { z } from "zod";

// Empty strings in .env mean "not set".
const optional = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const list = (def) => z.string().default(def).transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean));

function parseTrustProxy(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(4002),
  ALLOWED_ORIGINS: list("http://localhost:3000"),
  TRUST_PROXY: z.string().default("loopback").transform(parseTrustProxy),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  // Human-readable coloured logs (needs the pino-pretty dev dependency). Defaults to true outside production.
  LOG_PRETTY: optional(z.enum(["true", "false"])),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "copy the service_role key from Project Settings -> API"),
  // Only used by database/migrate.js (schema migrations). The API itself never opens a direct DB connection.
  SUPABASE_DB_URL: optional(z.string().regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection string")),
  SUPABASE_DB_SSL_CA: optional(z.string()),

  COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("op_sid"),
  COOKIE_PATH: z.string().startsWith("/").default("/api/supabase"),
  COOKIE_SECURE: optional(z.enum(["true", "false"])),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(168).default(8),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  ADMIN_SIGNUP_CODE: z.string().min(8, "must be at least 8 characters"),

  CRON_TIMEZONE: z.string().default("UTC"),
  REPORT_CRON: z.string().default("0 * * * *"),
  SESSION_CLEANUP_CRON: z.string().default("30 3 * * *"),

  MIGRATION_TOKEN: optional(z.string().min(32, "must be at least 32 characters")),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration (see .env.example):");
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

const e = parsed.data;
export const env = Object.freeze({
  ...e,
  isProd: e.NODE_ENV === "production",
  COOKIE_SECURE: e.COOKIE_SECURE ? e.COOKIE_SECURE === "true" : e.NODE_ENV === "production",
  LOG_PRETTY: e.LOG_PRETTY ? e.LOG_PRETTY === "true" : e.NODE_ENV !== "production",
});

export const DB_NAME = "supabase";
