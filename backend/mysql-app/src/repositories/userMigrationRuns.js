import { pool } from "../db/pool.js";

/** Audit trail for the MySQL -> Supabase user migration job. */
export async function startMigrationRun(at) {
  const [res] = await pool.execute("INSERT INTO user_migration_runs (started_at) VALUES (?)", [at]);
  return res.insertId;
}

export async function finishMigrationRun(id, { at, migrated, failed, error }) {
  await pool.execute("UPDATE user_migration_runs SET finished_at = ?, migrated = ?, failed = ?, error = ? WHERE id = ?", [
    at, migrated, failed, error ? String(error).slice(0, 255) : null, id,
  ]);
}

export async function lastMigrationRun() {
  const [rows] = await pool.execute(
    "SELECT started_at, finished_at, migrated, failed, error FROM user_migration_runs ORDER BY id DESC LIMIT 1",
  );
  const r = rows[0];
  return r
    ? {
        startedAt: new Date(r.started_at).toISOString(),
        finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
        migrated: r.migrated,
        failed: r.failed,
        error: r.error,
      }
    : null;
}
