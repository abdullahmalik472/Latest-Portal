// Schema migration runner for Supabase (Postgres), over a direct database connection.
//
//   npm run db:migrate            apply pending migrations
//   npm run db:migrate:status     list applied / pending migrations
//   npm run db:reset -- --yes     DROP this app's tables, then re-apply every migration (never in production)
//
// Needs SUPABASE_DB_URL (Dashboard -> Connect -> connection string). Without it you can still paste the
// files in ./migrations into the SQL editor in order, but nothing will track what was applied.
//
// Rules:
//  - Files named NNN_description.sql run once, in order, each inside its own transaction
//    (Postgres DDL is transactional: a failing migration leaves no trace).
//  - Applied versions + checksums live in orgportal_meta.schema_migrations, a schema the Supabase
//    REST API does not expose. Editing an applied file is refused; add a new migration instead.
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";
import { env } from "../src/config/env.js";

const DIR = new URL("./migrations/", import.meta.url);
const FILE_RE = /^(\d{3})_[a-z0-9_]+\.sql$/;
const LOCK_KEY = 727_001; // pg_advisory_lock id for this app
// Tables owned by this app, children first. `reset` drops exactly these and nothing else.
const OWNED_TABLES = ["registration_reports", "sessions", "courses", "users", "orgs"];

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

async function sslOptions(url) {
  const host = new URL(url).hostname;
  if (["localhost", "127.0.0.1"].includes(host)) return false;
  if (env.SUPABASE_DB_SSL_CA) return { ca: await readFile(env.SUPABASE_DB_SSL_CA, "utf8") }; // encrypted + verified
  console.warn("Warning: SUPABASE_DB_SSL_CA not set; the connection is encrypted but the server certificate is not verified.");
  return { rejectUnauthorized: false };
}

async function connect() {
  if (!env.SUPABASE_DB_URL) throw new Error("Set SUPABASE_DB_URL in .env to run migrations (see .env.example).");
  const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: await sslOptions(env.SUPABASE_DB_URL) });
  await client.connect();
  await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
  await client.query(`
    create schema if not exists orgportal_meta;
    revoke all on schema orgportal_meta from public, anon, authenticated;
    create table if not exists orgportal_meta.schema_migrations (
      version      text primary key,
      checksum     text not null,
      applied_at   timestamptz not null default now(),
      execution_ms integer not null
    );`);
  return client;
}

async function plan(client) {
  const files = await loadFiles();
  const { rows } = await client.query("select version, checksum, applied_at from orgportal_meta.schema_migrations order by version");
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

async function up(client) {
  const { pending, missing } = await plan(client);
  if (missing.length) console.warn(`Warning: applied but no longer on disk: ${missing.join(", ")}`);
  if (!pending.length) return console.log("Database is up to date.");
  for (const f of pending) {
    const t0 = Date.now();
    try {
      await client.query("begin");
      await client.query(f.sql);
      await client.query("insert into orgportal_meta.schema_migrations (version, checksum, execution_ms) values ($1, $2, $3)", [
        f.version, f.checksum, Date.now() - t0,
      ]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw new Error(`Migration ${f.version} failed and was rolled back: ${err.message}`, { cause: err });
    }
    console.log(`  applied ${f.version} (${Date.now() - t0} ms)`);
  }
  // Ask PostgREST (the Supabase REST API) to pick up the new tables right away.
  await client.query("notify pgrst, 'reload schema'");
  console.log(`Applied ${pending.length} migration(s).`);
}

async function status(client) {
  const { files, applied, missing } = await plan(client);
  for (const f of files) {
    const a = applied.get(f.version);
    console.log(`  ${a ? "applied" : "PENDING"}  ${f.version}${a ? `  (${new Date(a.applied_at).toISOString()})` : ""}`);
  }
  for (const m of missing) console.log(`  MISSING  ${m}  (applied, file deleted)`);
}

async function reset(client) {
  if (env.isProd) throw new Error("db:reset is disabled when NODE_ENV=production");
  if (!process.argv.includes("--yes")) {
    throw new Error(`This drops ${OWNED_TABLES.length} tables and all their data. Re-run with: npm run db:reset -- --yes`);
  }
  await client.query("begin");
  for (const t of OWNED_TABLES) await client.query(`drop table if exists public.${t} cascade`);
  await client.query("truncate orgportal_meta.schema_migrations");
  await client.query("commit");
  console.log("Dropped OrgPortal tables.");
  await up(client);
}

const COMMANDS = { up, status, reset };
const command = COMMANDS[process.argv[2] ?? "up"];
if (!command) {
  console.error("Usage: node database/migrate.js <up | status | reset --yes>");
  process.exit(1);
}

let client;
try {
  client = await connect();
  await command(client);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}
