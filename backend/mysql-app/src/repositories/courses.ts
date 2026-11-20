import { query, exec, type SqlParam } from "../db/query.ts";
import type { CamelKeys, Serialized } from "../types/transform.ts";

/** Shape of one row returned by SELECT below (snake_case, straight from MySQL). */
interface CourseRow {
  id: string;
  title: string;
  org_id: string;
  teacher_id: string;
  created_at: Date;
  org_name: string;
  teacher_name: string;
}

/** What the API returns: CourseRow with camelCase keys and dates as strings. Generated, never written by hand. */
export type Course = Serialized<CamelKeys<CourseRow>>;

function toCourse(r: CourseRow): Course {
  return {
    id: r.id,
    title: r.title,
    orgId: r.org_id,
    teacherId: r.teacher_id,
    orgName: r.org_name,
    teacherName: r.teacher_name,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const SELECT = `SELECT c.id, c.title, c.org_id, c.teacher_id, c.created_at, o.name AS org_name, t.name AS teacher_name
                  FROM courses c
                  JOIN orgs o ON o.id = c.org_id
                  JOIN users t ON t.id = c.teacher_id`;

export async function list({ orgId, teacherId }: { orgId?: string; teacherId?: string } = {}): Promise<Course[]> {
  const where: string[] = [];
  const params: SqlParam[] = [];
  if (orgId) { where.push("c.org_id = ?"); params.push(orgId); }
  if (teacherId) { where.push("c.teacher_id = ?"); params.push(teacherId); }
  const rows = await query<CourseRow>(`${SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY c.created_at DESC`, params);
  return rows.map(toCourse);
}

export async function insert({ id, orgId, teacherId, title, createdAt }: {
  id: string; orgId: string; teacherId: string; title: string; createdAt: Date;
}): Promise<Course> {
  await exec("INSERT INTO courses (id, org_id, teacher_id, title, created_at) VALUES (?, ?, ?, ?, ?)", [
    id, orgId, teacherId, title, createdAt,
  ]);
  const [row] = await query<CourseRow>(`${SELECT} WHERE c.id = ?`, [id]);
  return toCourse(row);
}
