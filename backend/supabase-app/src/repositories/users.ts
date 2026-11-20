import { isUniqueViolation, must, sb } from "../db/supabase.ts";
import { newRegNumber } from "../utils/crypto.js";
import { USER_COLS, clampLimit, toPublicUser, type UserRow } from "./mappers.ts";
import type { Credentials, NewUser, PublicUser, Role, UserFilter } from "../types/domain.ts";

/** Every account with this email (used for login and the password-uniqueness rule). */
export async function findCredentialsByEmail(email: string): Promise<Credentials[]> {
  const rows = must<{ id: string; org_id: string; password_hash: string; created_at: string }[]>(
    await sb.from("users").select("id, org_id, password_hash, created_at").eq("email", email).order("created_at").limit(50),
  );
  return rows.map((r) => ({ id: r.id, orgId: r.org_id, passwordHash: r.password_hash, createdAt: new Date(r.created_at) }));
}

export async function findById(id: string): Promise<PublicUser | null> {
  const row = must<UserRow | null>(await sb.from("users").select(USER_COLS).eq("id", id).maybeSingle());
  return row ? toPublicUser(row) : null;
}

/** Inserts a user, allocating a unique registration number (retries on the rare collision). */
export async function insert({ id, orgId, name, email, passwordHash, role, createdAt }: NewUser): Promise<PublicUser | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb
      .from("users")
      .insert({ id, org_id: orgId, name, email, password_hash: passwordHash, role, reg: newRegNumber(createdAt), created_at: createdAt.toISOString() })
      .select(USER_COLS)
      .single();
    if (isUniqueViolation(error, "users_reg_uq")) continue;
    // supabase-js guesses that the embedded `org` is an array (it cannot see the schema);
    // a user has exactly one org, so must<UserRow>() states the real shape.
    return toPublicUser(must<UserRow>({ data, error }));
  }
  throw new Error("Could not allocate a unique registration number");
}

export async function list({ role, orgId, limit = 1000 }: UserFilter = {}): Promise<PublicUser[]> {
  let q = sb.from("users").select(USER_COLS).order("created_at", { ascending: false }).limit(clampLimit(limit));
  if (role) q = q.eq("role", role);
  if (orgId) q = q.eq("org_id", orgId);
  return must<UserRow[]>(await q).map(toPublicUser);
}

export async function isTeacherInOrg(teacherId: string, orgId: string): Promise<boolean> {
  const row = must<{ id: string } | null>(
    await sb.from("users").select("id").eq("id", teacherId).eq("org_id", orgId).eq("role", "teacher").maybeSingle(),
  );
  return Boolean(row);
}

/** ReturnType + Awaited: the type findById resolves to, derived from the function itself (PublicUser | null). */
export type FoundUser = Awaited<ReturnType<typeof findById>>;

/* ---------- used by the MySQL -> Supabase import ---------- */

/** One row written by the import (snake_case, as stored in Postgres). */
export interface ImportedUserRow {
  id: string;
  org_id: string | undefined;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  reg: string;
  created_at: string;
  migrated_from: "mysql";
  imported_at: string;
}

/** Inserts rows, skipping ids that already exist. Returns the ids actually inserted. */
export async function insertIgnoringExisting(rows: ImportedUserRow[]): Promise<string[]> {
  const data = must<{ id: string }[]>(await sb.from("users").upsert(rows, { onConflict: "id", ignoreDuplicates: true }).select("id"));
  return data.map((r) => r.id);
}
