import { DbError, isUniqueViolation, must, sb } from "../db/supabase.js";
import { newRegNumber } from "../utils/crypto.js";
import { USER_COLS, clampLimit, toPublicUser } from "./mappers.js";

/** Every account with this email (used for login and the password-uniqueness rule). */
export async function findCredentialsByEmail(email) {
  const rows = must(
    await sb.from("users").select("id, org_id, password_hash, created_at").eq("email", email).order("created_at").limit(50),
  );
  return rows.map((r) => ({ id: r.id, orgId: r.org_id, passwordHash: r.password_hash, createdAt: new Date(r.created_at) }));
}

export async function findById(id) {
  const row = must(await sb.from("users").select(USER_COLS).eq("id", id).maybeSingle());
  return row ? toPublicUser(row) : null;
}

/** Inserts a user, allocating a unique registration number (retries on the rare collision). */
export async function insert({ id, orgId, name, email, passwordHash, role, createdAt }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb
      .from("users")
      .insert({ id, org_id: orgId, name, email, password_hash: passwordHash, role, reg: newRegNumber(createdAt), created_at: createdAt.toISOString() })
      .select(USER_COLS)
      .single();
    if (isUniqueViolation(error, "users_reg_uq")) continue;
    if (error) throw new DbError(error);
    return toPublicUser(data);
  }
  throw new Error("Could not allocate a unique registration number");
}

export async function list({ role, orgId, limit = 1000 } = {}) {
  let q = sb.from("users").select(USER_COLS).order("created_at", { ascending: false }).limit(clampLimit(limit));
  if (role) q = q.eq("role", role);
  if (orgId) q = q.eq("org_id", orgId);
  return must(await q).map(toPublicUser);
}

export async function isTeacherInOrg(teacherId, orgId) {
  const row = must(await sb.from("users").select("id").eq("id", teacherId).eq("org_id", orgId).eq("role", "teacher").maybeSingle());
  return Boolean(row);
}

/* ---------- used by the MySQL -> Supabase import ---------- */

/** Inserts rows, skipping ids that already exist. Returns the ids actually inserted. */
export async function insertIgnoringExisting(rows) {
  const data = must(await sb.from("users").upsert(rows, { onConflict: "id", ignoreDuplicates: true }).select("id"));
  return data.map((r) => r.id);
}
