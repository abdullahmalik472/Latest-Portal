import { isUniqueViolation, must, sb } from "../db/supabase.js";
import { conflict } from "../utils/errors.js";
import { toPublicUser } from "./mappers.js";

export async function list() {
  return must(await sb.from("orgs").select("id, name").order("name"));
}

export async function findById(id) {
  return must(await sb.from("orgs").select("id, name").eq("id", id).maybeSingle());
}

export async function findByIds(ids) {
  if (!ids.length) return [];
  return must(await sb.from("orgs").select("id, name").in("id", ids).order("name"));
}

export async function insert({ id, name, createdAt }) {
  const { error } = await sb.from("orgs").insert({ id, name, created_at: createdAt.toISOString() });
  if (isUniqueViolation(error, "orgs_name_key_uq")) throw conflict("ORG_EXISTS", "This organization already exists");
  must({ error });
  return { id, name };
}

/** Every org with its members and counts (admin overview). */
export async function details() {
  const rows = must(
    await sb
      .from("orgs")
      .select("id, name, users!users_org_fk(id, org_id, name, email, role, reg, created_at), courses!courses_org_fk(count)")
      .order("name"),
  );
  return rows.map((o) => {
    const members = (o.users ?? [])
      .map((u) => toPublicUser({ ...u, org_name: o.name }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      id: o.id,
      name: o.name,
      users: members,
      teachers: members.filter((u) => u.role === "teacher").length,
      students: members.filter((u) => u.role === "student").length,
      courses: o.courses?.[0]?.count ?? 0,
    };
  });
}

/* ---------- used by the MySQL -> Supabase import ---------- */
const keyOf = (name) => name.trim().toLowerCase();

/** Returns a Map(name_key -> org id), creating any organizations that do not exist yet. */
export async function ensureByNames(names) {
  const wanted = new Map(names.map((n) => [keyOf(n), n.trim()])); // name_key -> display name
  const load = async () => must(await sb.from("orgs").select("id, name_key").in("name_key", [...wanted.keys()]));

  let found = await load();
  const have = new Set(found.map((o) => o.name_key));
  const missing = [...wanted].filter(([key]) => !have.has(key)).map(([, name]) => ({ name }));
  if (missing.length) {
    // ignoreDuplicates: a concurrent import creating the same org is harmless.
    must(await sb.from("orgs").upsert(missing, { onConflict: "name_key", ignoreDuplicates: true }));
    found = await load();
  }
  return new Map(found.map((o) => [o.name_key, o.id]));
}

export { keyOf as orgKey };
