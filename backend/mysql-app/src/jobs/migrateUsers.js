// One-way user migration: MySQL -> Supabase.
//
// Users that have not been copied yet are sent in batches to the supabase-app's internal endpoint
// (bearer-token protected). Supabase owns its own writes; MySQL only records what was copied.
// Rows are never deleted from MySQL and nothing ever flows back.
//
// Safety:
//  - MySQL GET_LOCK makes concurrent runs (two workers, cron + manual run) skip instead of racing.
//  - Idempotent: Supabase ignores users whose id already exists, so a retried batch cannot duplicate.
//  - Per-user failures are recorded and retried up to MAX_MIGRATION_ATTEMPTS times.
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import * as migrationRuns from "../repositories/userMigrationRuns.js";
import * as users from "../repositories/users.ts";
import { log } from "../utils/log.js";

const LOCK = "orgportal_user_migration";
const MAX_BATCHES_PER_RUN = 50;

/**
 * Plain HTTP is acceptable only when traffic never leaves the machine / private network:
 * loopback, a single-label service name (e.g. "supabase-app" on a Docker network) or a private IPv4.
 */
function isPrivateHost(host) {
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  if (/^[a-z0-9-]+$/i.test(host)) return true;
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

async function pushBatch(batch) {
  const res = await fetch(new URL("/internal/migrations/users", env.SUPABASE_APP_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.MIGRATION_TOKEN}` },
    body: JSON.stringify({ users: batch }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`supabase-app responded ${res.status}: ${body?.error?.message ?? "no details"}`);
  return body; // { imported: string[], alreadyPresent: string[], failed: {id, reason}[] }
}

export async function runUserMigration() {
  if (!env.SUPABASE_APP_URL || !env.MIGRATION_TOKEN) throw new Error("Set SUPABASE_APP_URL and MIGRATION_TOKEN to migrate users");
  const url = new URL(env.SUPABASE_APP_URL);
  if (env.isProd && url.protocol !== "https:" && !isPrivateHost(url.hostname)) {
    throw new Error("Refusing to send password hashes over plain HTTP to a public host in production. Use an https SUPABASE_APP_URL.");
  }

  const conn = await pool.getConnection();
  try {
    const [[{ got }]] = await conn.query("SELECT GET_LOCK(?, 0) AS got", [LOCK]);
    if (got !== 1) {
      log.info("user migration skipped: another run is in progress");
      return { skipped: true };
    }

    const runId = await migrationRuns.startMigrationRun(new Date());
    let migrated = 0;
    let failed = 0;
    let error = null;
    try {
      for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
        const batch = await users.pendingMigration(env.MIGRATION_BATCH_SIZE);
        if (!batch.length) break;

        const result = await pushBatch(batch);
        const done = [...result.imported, ...result.alreadyPresent];
        await users.markMigrated(done, new Date());
        await users.markMigrationFailed(result.failed);
        migrated += done.length;
        failed += result.failed.length;
        log.info("user migration batch", { imported: result.imported.length, alreadyPresent: result.alreadyPresent.length, failed: result.failed.length });

        if (!done.length) break; // whole batch failed: stop, retry on the next run
      }
    } catch (err) {
      error = err.message;
      throw err;
    } finally {
      await migrationRuns.finishMigrationRun(runId, { at: new Date(), migrated, failed, error });
      log.info("user migration finished", { migrated, failed, error });
    }
    return { migrated, failed };
  } finally {
    await conn.query("SELECT RELEASE_LOCK(?)", [LOCK]).catch(() => {});
    conn.release();
  }
}
