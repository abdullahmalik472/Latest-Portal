import { pool } from "../db/pool.js";
import { conflict } from "../utils/errors.js";
import { toPublicUser } from "./mappers.js";

export async function list() {
  const [rows] = await pool.execute("SELECT id, name FROM orgs ORDER BY name");
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute("SELECT id, name FROM orgs WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function findByIds(ids) {
  if (!ids.length) return [];
  const [rows] = await pool.query("SELECT id, name FROM orgs WHERE id IN (?) ORDER BY name", [ids]);
  return rows;
}

export async function insert({ id, name, createdAt }) {
  try {
    await pool.execute("INSERT INTO orgs (id, name, created_at) VALUES (?, ?, ?)", [id, name, createdAt]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw conflict("ORG_EXISTS", "This organization already exists");
    throw err;
  }
  return { id, name };
}

/** Every org with its members and counts (admin overview). */
export async function details() {
  const [orgs] = await pool.execute(
    `SELECT o.id, o.name, (SELECT COUNT(*) FROM courses c WHERE c.org_id = o.id) AS courses
       FROM orgs o ORDER BY o.name`,
  );
  const [users] = await pool.execute(
    "SELECT id, org_id, name, email, role, reg, created_at FROM users ORDER BY created_at DESC",
  );
  return orgs.map((o) => {
    const members = users.filter((u) => u.org_id === o.id).map((u) => toPublicUser({ ...u, org_name: o.name }));
    return {
      id: o.id,
      name: o.name,
      users: members,
      teachers: members.filter((u) => u.role === "teacher").length,
      students: members.filter((u) => u.role === "student").length,
      courses: Number(o.courses),
    };
  });
}
