// Schema migration runner for MySQL.
//
//   npm run db:migrate            apply pending migrations (creates the database if missing)
//   npm run db:migrate:status     list applied / pending migrations
//   npm run db:reset -- --yes     DROP this app's tables, then re-apply every migration (never in production)
//
// Rules:
//  - Files in ./migrations named NNN_description.sql run once, in order, tracked in `schema_migrations`.
//  - Never edit a migration that has been applied: the runner stores a checksum and refuses to continue
//    if an applied file changed. Add a new migration instead.
//  - MySQL auto-commits DDL, so keep one change per file: a failure then leaves nothing half-applied.
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import mysql from "mysql2/promise";
import { env } from "../src/config/env.js";

const DIR = new URL("./migrations/", import.meta.url);
const FILE_RE = /^(\d{3})_[a-z0-9_]+\.sql$/;
const LOCK = "orgportal_schema_migrate";
// Tables owned by this app, children first. `reset` drops exactly these and nothing else in the database.
const OWNED_TABLES = ["user_migration_runs", "registration_reports", "sessions", "courses", "users", "orgs", "schema_migrations"];

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function loadFiles() {
  const names = (await readdir(DIR)).filter((n) => n.endsWith(".sql")).sort();
  const bad = names.filter((n) => !FILE_RE.test(n));
  if (bad.length) throw new Error(`Badly named migration file(s): ${bad.join(", ")} (expected NNN_description.sql)`);
  const files = [];
  for (const name of names) {
    const sql = await readFile(new URL(name, DIR), "utf8");
    files.push({ version: name.replace(/\.sql$/, ""), sql, checksum: sha256(sql) });
  }
  const dup = files.map((f) => f.version.slice(0, 3)).find((n, i, all) => all.indexOf(n) !== i);
  if (dup) throw new Error(`Two migrations share the number ${dup}`);
  return files;
}

async function connect() {
  const conn = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    multipleStatements: true, // only on this one-off admin connection, never on the app pool
    timezone: "Z",
  });
  // MYSQL_DATABASE is validated against /^[A-Za-z0-9_]+$/ in config/env.js, so interpolation is safe.
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await conn.query(`USE \`${env.MYSQL_DATABASE}\``);
  const [[{ got }]] = await conn.query("SELECT GET_LOCK(?, 30) AS got", [LOCK]);
  if (got !== 1) throw new Error("Another migration is running (lock busy for 30s)");
  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version      VARCHAR(255) NOT NULL,
    checksum     CHAR(64)     NOT NULL,
    applied_at   DATETIME(3)  NOT NULL,
    execution_ms INT UNSIGNED NOT NULL,
    PRIMARY KEY (version)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  return conn;
}

async function plan(conn) {
  const files = await loadFiles();
  const [rows] = await conn.query("SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version");
  const applied = new Map(rows.map((r) => [r.version, r]));
  for (const f of files) {
    const a = applied.get(f.version);
    if (a && a.checksum !== f.checksum) {
      throw new Error(`Migration ${f.version} was edited after it was applied. Revert the file and add a new migration instead.`);
    }
  }
  const missing = rows.filter((r) => !files.some((f) => f.version === r.version)).map((r) => r.version);
  return { files, applied, pending: files.filter((f) => !applied.has(f.version)), missing };
}

async function up(conn) {
  const { pending, missing } = await plan(conn);
  if (missing.length) console.warn(`Warning: applied but no longer on disk: ${missing.join(", ")}`);
  if (!pending.length) return console.log("Database is up to date.");
  for (const f of pending) {
    const t0 = Date.now();
    try {
      await conn.query(f.sql);
    } catch (err) {
      throw new Error(`Migration ${f.version} failed: ${err.message}`, { cause: err });
    }
    const ms = Date.now() - t0;
    await conn.execute("INSERT INTO schema_migrations (version, checksum, applied_at, execution_ms) VALUES (?, ?, ?, ?)", [
      f.version, f.checksum, new Date(), ms,
    ]);
    console.log(`  applied ${f.version} (${ms} ms)`);
  }
  console.log(`Applied ${pending.length} migration(s) to "${env.MYSQL_DATABASE}".`);
}

async function status(conn) {
  const { files, applied, missing } = await plan(conn);
  for (const f of files) {
    const a = applied.get(f.version);
    console.log(`  ${a ? "applied" : "PENDING"}  ${f.version}${a ? `  (${new Date(a.applied_at).toISOString()})` : ""}`);
  }
  for (const m of missing) console.log(`  MISSING  ${m}  (applied, file deleted)`);
}

async function reset(conn) {
  if (env.isProd) throw new Error("db:reset is disabled when NODE_ENV=production");
  if (!process.argv.includes("--yes")) {
    throw new Error(`This drops ${OWNED_TABLES.length - 1} tables in "${env.MYSQL_DATABASE}" and all their data. Re-run with: npm run db:reset -- --yes`);
  }
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of OWNED_TABLES) await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log(`Dropped OrgPortal tables in "${env.MYSQL_DATABASE}".`);
  await conn.end();
  const fresh = await connect();
  try {
    await up(fresh);
  } finally {
    await fresh.end();
  }
}

const COMMANDS = { up, status, reset };
const command = COMMANDS[process.argv[2] ?? "up"];
if (!command) {
  console.error("Usage: node database/migrate.js <up | status | reset --yes>");
  process.exit(1);
}

let conn;
try {
  conn = await connect();
  await command(conn);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await conn?.end().catch(() => {});
}
