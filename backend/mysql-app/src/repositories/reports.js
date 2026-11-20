import { pool } from "../db/pool.js";
import { WINDOWS, windowStart } from "../utils/windows.js";
import { clampLimit } from "./mappers.ts";

const COUNT_KEYS = ["total_users", ...WINDOWS.map((w) => w.key)];

/** { total_users, last_10m, last_1h, last_1d, last_7d, last_30d } at `now`. */
export async function windowCounts(now) {
  // w.key values are constants from utils/windows.js, never user input.
  const cols = WINDOWS.map((w) => `COALESCE(SUM(created_at >= ?), 0) AS ${w.key}`).join(", ");
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total_users, ${cols} FROM users`,
    WINDOWS.map((w) => windowStart(now, w.minutes)),
  );
  return Object.fromEntries(COUNT_KEYS.map((k) => [k, Number(row[k])]));
}

export async function insertSnapshot({ generatedAt, counts }) {
  await pool.execute(
    `INSERT INTO registration_reports (generated_at, ${COUNT_KEYS.join(", ")}) VALUES (?, ${COUNT_KEYS.map(() => "?").join(", ")})`,
    [generatedAt, ...COUNT_KEYS.map((k) => counts[k])],
  );
}

export async function listSnapshots(limit = 24) {
  const [rows] = await pool.execute(
    `SELECT generated_at, ${COUNT_KEYS.join(", ")} FROM registration_reports ORDER BY generated_at DESC LIMIT ${clampLimit(limit, 500)}`,
  );
  return rows.map((r) => ({
    generatedAt: new Date(r.generated_at).toISOString(),
    ...Object.fromEntries(COUNT_KEYS.map((k) => [k, Number(r[k])])),
  }));
}
