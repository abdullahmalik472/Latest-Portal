import { countOf, must, sb } from "../db/supabase.js";
import { WINDOWS, windowStart } from "../utils/windows.js";
import { clampLimit } from "./mappers.js";

const COUNT_KEYS = ["total_users", ...WINDOWS.map((w) => w.key)];
const head = () => sb.from("users").select("id", { count: "exact", head: true });

/** { total_users, last_10m, last_1h, last_1d, last_7d, last_30d } at `now`. */
export async function windowCounts(now) {
  const values = await Promise.all([
    countOf(head()),
    ...WINDOWS.map((w) => countOf(head().gte("created_at", windowStart(now, w.minutes).toISOString()))),
  ]);
  return Object.fromEntries(COUNT_KEYS.map((k, i) => [k, values[i]]));
}

export async function insertSnapshot({ generatedAt, counts }) {
  must(
    await sb.from("registration_reports").insert({
      generated_at: generatedAt.toISOString(),
      ...Object.fromEntries(COUNT_KEYS.map((k) => [k, counts[k]])),
    }),
  );
}

export async function listSnapshots(limit = 24) {
  const rows = must(
    await sb
      .from("registration_reports")
      .select(`generated_at, ${COUNT_KEYS.join(", ")}`)
      .order("generated_at", { ascending: false })
      .limit(clampLimit(limit, 500)),
  );
  return rows.map((r) => ({ generatedAt: new Date(r.generated_at).toISOString(), ...Object.fromEntries(COUNT_KEYS.map((k) => [k, r[k]])) }));
}
