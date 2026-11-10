import { pool } from "../db/pool.js";
import { newRegNumber } from "../utils/crypto.js";
import { clampLimit, toPublicUser } from "./mappers.js";

const PUBLIC = `SELECT u.id, u.org_id, u.name, u.email, u.role, u.reg, u.created_at, o.name AS org_name
                  FROM users u JOIN orgs o ON o.id = u.org_id`;

/** Every account with this email (used for login and the password-uniqueness rule). */
export async function findCredentialsByEmail(email) {
  const [rows] = await pool.execute(
    "SELECT id, org_id, password_hash, created_at FROM users WHERE email = ? ORDER BY created_at LIMIT 50",
    [email],
  );
  return rows.map((r) => ({ id: r.id, orgId: r.org_id, passwordHash: r.password_hash, createdAt: new Date(r.created_at) }));
}

export async function findById(id) {
  const [rows] = await pool.execute(`${PUBLIC} WHERE u.id = ?`, [id]);
  return rows[0] ? toPublicUser(rows[0]) : null;
}

/** Inserts a user, allocating a unique registration number (retries on the rare collision). */
export async function insert({ id, orgId, name, email, passwordHash, role, createdAt }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await pool.execute(
        "INSERT INTO users (id, org_id, name, email, password_hash, role, reg, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, orgId, name, email, passwordHash, role, newRegNumber(createdAt), createdAt],
      );
      return findById(id);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY" && err.message.includes("uq_users_reg")) continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a unique registration number");
}

export async function list({ role, orgId, limit = 1000 } = {}) {
  const where = [];
  const params = [];
  if (role) { where.push("u.role = ?"); params.push(role); }
  if (orgId) { where.push("u.org_id = ?"); params.push(orgId); }
  const sql = `${PUBLIC} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY u.created_at DESC LIMIT ${clampLimit(limit)}`;
  const [rows] = await pool.execute(sql, params);
  return rows.map(toPublicUser);
}

export async function isTeacherInOrg(teacherId, orgId) {
  const [rows] = await pool.execute("SELECT 1 FROM users WHERE id = ? AND org_id = ? AND role = 'teacher'", [teacherId, orgId]);
  return rows.length > 0;
}

/* ---------- one-way migration to Supabase ---------- */

export const MAX_MIGRATION_ATTEMPTS = 5;

/** Users not yet copied to Supabase (includes the bcrypt hash: hashes are portable between backends). */
export async function pendingMigration(limit) {
  const [rows] = await pool.execute(
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

export async function markMigrated(ids, at) {
  if (!ids.length) return;
  await pool.query("UPDATE users SET migrated_at = ?, migration_error = NULL WHERE id IN (?)", [at, ids]);
}

export async function markMigrationFailed(failures) {
  for (const f of failures) {
    await pool.execute("UPDATE users SET migration_attempts = migration_attempts + 1, migration_error = ? WHERE id = ?", [
      String(f.reason).slice(0, 255),
      f.id,
    ]);
  }
}

export async function migrationCounts() {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(migrated_at IS NOT NULL), 0) AS migrated,
            COALESCE(SUM(migrated_at IS NULL AND migration_attempts < ${MAX_MIGRATION_ATTEMPTS}), 0) AS pending,
            COALESCE(SUM(migrated_at IS NULL AND migration_attempts >= ${MAX_MIGRATION_ATTEMPTS}), 0) AS stuck
       FROM users`,
  );
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]));
}
