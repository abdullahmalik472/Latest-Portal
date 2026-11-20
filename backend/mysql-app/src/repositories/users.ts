import { pool } from "../db/pool.js";
import { query, exec } from "../db/query.ts";
import { newRegNumber } from "../utils/crypto.js";
import { clampLimit, toPublicUser, type UserRow } from "./mappers.ts";
import type { Credentials, MigrationCounts, MigrationUser, NewUser, PublicUser, UserFilter } from "../types/domain.ts";

const PUBLIC = `SELECT u.id, u.org_id, u.name, u.email, u.role, u.reg, u.created_at, o.name AS org_name
                  FROM users u JOIN orgs o ON o.id = u.org_id`;

/** Every account with this email (used for login and the password-uniqueness rule). */
export async function findCredentialsByEmail(email: string): Promise<Credentials[]> {
  const rows = await query<{ id: string; org_id: string; password_hash: string; created_at: Date }>(
    "SELECT id, org_id, password_hash, created_at FROM users WHERE email = ? ORDER BY created_at LIMIT 50",
    [email],
  );
  return rows.map((r) => ({ id: r.id, orgId: r.org_id, passwordHash: r.password_hash, createdAt: new Date(r.created_at) }));
}

export async function findById(id: string): Promise<PublicUser | null> {
  const rows = await query<UserRow>(`${PUBLIC} WHERE u.id = ?`, [id]);
  return rows[0] ? toPublicUser(rows[0]) : null;
}

/** Inserts a user, allocating a unique registration number (retries on the rare collision). */
export async function insert({ id, orgId, name, email, passwordHash, role, createdAt }: NewUser): Promise<PublicUser | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await exec(
        "INSERT INTO users (id, org_id, name, email, password_hash, role, reg, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, orgId, name, email, passwordHash, role, newRegNumber(createdAt), createdAt],
      );
      return findById(id);
    } catch (err) {
      // err is "unknown" in TypeScript, so we narrow it before reading .code (more on this in Topic 4).
      if (err instanceof Error && "code" in err && err.code === "ER_DUP_ENTRY" && err.message.includes("uq_users_reg")) continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a unique registration number");
}

export async function list({ role, orgId, limit = 1000 }: UserFilter = {}): Promise<PublicUser[]> {
  const where: string[] = [];
  const params: string[] = [];
  if (role) { where.push("u.role = ?"); params.push(role); }
  if (orgId) { where.push("u.org_id = ?"); params.push(orgId); }
  const sql = `${PUBLIC} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY u.created_at DESC LIMIT ${clampLimit(limit)}`;
  const rows = await query<UserRow>(sql, params);
  return rows.map(toPublicUser);
}

export async function isTeacherInOrg(teacherId: string, orgId: string): Promise<boolean> {
  const rows = await query<{ found: number }>(
    "SELECT 1 AS found FROM users WHERE id = ? AND org_id = ? AND role = 'teacher'",
    [teacherId, orgId],
  );
  return rows.length > 0;
}

/** ReturnType + Awaited: the type findById resolves to, derived from the function itself (PublicUser | null). */
export type FoundUser = Awaited<ReturnType<typeof findById>>;

/* ---------- one-way migration to Supabase ---------- */

export const MAX_MIGRATION_ATTEMPTS = 5;

interface MigrationRow extends UserRow {
  password_hash: string;
  org_name: string;
}

/** Users not yet copied to Supabase (includes the bcrypt hash: hashes are portable between backends). */
export async function pendingMigration(limit: number): Promise<MigrationUser[]> {
  const rows = await query<MigrationRow>(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.reg, u.created_at, o.name AS org_name
       FROM users u JOIN orgs o ON o.id = u.org_id
      WHERE u.migrated_at IS NULL AND u.migration_attempts < ${MAX_MIGRATION_ATTEMPTS}
      ORDER BY u.created_at
      LIMIT ${clampLimit(limit, 200)}`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash,
    role: r.role,
    reg: r.reg,
    orgName: r.org_name,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function markMigrated(ids: string[], at: Date): Promise<void> {
  if (!ids.length) return;
  // pool.query (not execute) expands the array for IN (?).
  await pool.query("UPDATE users SET migrated_at = ?, migration_error = NULL WHERE id IN (?)", [at, ids]);
}

export async function markMigrationFailed(failures: { id: string; reason: unknown }[]): Promise<void> {
  for (const f of failures) {
    await exec("UPDATE users SET migration_attempts = migration_attempts + 1, migration_error = ? WHERE id = ?", [
      String(f.reason).slice(0, 255),
      f.id,
    ]);
  }
}

export async function migrationCounts(): Promise<MigrationCounts> {
  // MySQL returns SUM() as a string, so every value is converted with Number().
  const [row] = await query<Record<keyof MigrationCounts, string | number>>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(migrated_at IS NOT NULL), 0) AS migrated,
            COALESCE(SUM(migrated_at IS NULL AND migration_attempts < ${MAX_MIGRATION_ATTEMPTS}), 0) AS pending,
            COALESCE(SUM(migrated_at IS NULL AND migration_attempts >= ${MAX_MIGRATION_ATTEMPTS}), 0) AS stuck
       FROM users`,
  );
  return {
    total: Number(row.total),
    migrated: Number(row.migrated),
    pending: Number(row.pending),
    stuck: Number(row.stuck),
  };
}
