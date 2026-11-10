import { pool } from "../db/pool.js";
import { toCourse } from "./mappers.js";

const SELECT = `SELECT c.id, c.title, c.org_id, c.teacher_id, c.created_at, o.name AS org_name, t.name AS teacher_name
                  FROM courses c
                  JOIN orgs o ON o.id = c.org_id
                  JOIN users t ON t.id = c.teacher_id`;

export async function list({ orgId, teacherId } = {}) {
  const where = [];
  const params = [];
  if (orgId) { where.push("c.org_id = ?"); params.push(orgId); }
  if (teacherId) { where.push("c.teacher_id = ?"); params.push(teacherId); }
  const [rows] = await pool.execute(`${SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY c.created_at DESC`, params);
  return rows.map(toCourse);
}

export async function insert({ id, orgId, teacherId, title, createdAt }) {
  await pool.execute("INSERT INTO courses (id, org_id, teacher_id, title, created_at) VALUES (?, ?, ?, ?, ?)", [
    id, orgId, teacherId, title, createdAt,
  ]);
  const [rows] = await pool.execute(`${SELECT} WHERE c.id = ?`, [id]);
  return toCourse(rows[0]);
}
