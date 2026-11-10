import "dotenv/config";
import { z } from "zod";

// Empty strings in .env mean "not set".
const optional = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const flag = (def) => z.enum(["true", "false"]).default(def).transform((v) => v === "true");
const list = (def) => z.string().default(def).transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean));

function parseTrustProxy(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v; // e.g. "loopback", "10.0.0.0/8"
}

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().positive().default(4001),
    ALLOWED_ORIGINS: list("http://localhost:3000"),
    TRUST_PROXY: z.string().default("loopback").transform(parseTrustProxy),

    MYSQL_HOST: z.string().default("127.0.0.1"),
    MYSQL_PORT: z.coerce.number().int().positive().default(3306),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string().default(""),
    MYSQL_DATABASE: z.string().regex(/^[A-Za-z0-9_]+$/, "letters, digits and _ only").default("orgportal"),

    COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("op_sid"),
    COOKIE_PATH: z.string().startsWith("/").default("/api/mysql"),
    COOKIE_SECURE: optional(z.enum(["true", "false"])),
    SESSION_TTL_HOURS: z.coerce.number().positive().max(168).default(8),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    ADMIN_SIGNUP_CODE: z.string().min(8, "must be at least 8 characters"),

    CRON_TIMEZONE: z.string().default("UTC"),
    REPORT_CRON: z.string().default("0 * * * *"),
    SESSION_CLEANUP_CRON: z.string().default("30 3 * * *"),

    MIGRATION_ENABLED: flag("false"),
    MIGRATION_CRON: z.string().default("*/15 * * * *"),
    MIGRATION_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(100),
    SUPABASE_APP_URL: optional(z.url()),
    MIGRATION_TOKEN: optional(z.string().min(32, "must be at least 32 characters")),
  })
  .superRefine((e, ctx) => {
    if (e.MIGRATION_ENABLED && (!e.SUPABASE_APP_URL || !e.MIGRATION_TOKEN)) {
      ctx.addIssue({ code: "custom", path: ["MIGRATION_ENABLED"], message: "requires SUPABASE_APP_URL and MIGRATION_TOKEN" });
    }
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
});

export const DB_NAME = "mysql";
