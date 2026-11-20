import { must, sb } from "../db/supabase.ts";
import type { CamelKeys, Serialized } from "../types/transform.ts";
import { COURSE_COLS } from "./mappers.ts";

/** The API fields of a course, written once in snake_case. */
interface CourseFields {
  id: string;
  title: string;
  org_id: string;
  teacher_id: string;
  org_name: string | null;
  teacher_name: string | null;
  created_at: Date;
}

/** What the API returns: camelCase keys and dates as strings. Generated, never written by hand. */
export type Course = Serialized<CamelKeys<CourseFields>>;

/** What PostgREST returns for COURSE_COLS: the org and teacher names arrive as embedded objects. */
interface CourseRow {
  id: string;
  title: string;
  org_id: string;
  teacher_id: string;
  created_at: string;
  org: { name: string } | null;
  teacher: { name: string } | null;
}

function toCourse(r: CourseRow): Course {
  return {
    id: r.id,
    title: r.title,
    orgId: r.org_id,
    teacherId: r.teacher_id,
    orgName: r.org?.name ?? null,
    teacherName: r.teacher?.name ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function list({ orgId, teacherId }: { orgId?: string; teacherId?: string } = {}): Promise<Course[]> {
  let q = sb.from("courses").select(COURSE_COLS).order("created_at", { ascending: false });
  if (orgId) q = q.eq("org_id", orgId);
  if (teacherId) q = q.eq("teacher_id", teacherId);
  return must<CourseRow[]>(await q).map(toCourse);
}

export async function insert({ id, orgId, teacherId, title, createdAt }: {
  id: string; orgId: string; teacherId: string; title: string; createdAt: Date;
}): Promise<Course> {
  const row = must<CourseRow>(
    await sb
      .from("courses")
      .insert({ id, org_id: orgId, teacher_id: teacherId, title, created_at: createdAt.toISOString() })
      .select(COURSE_COLS)
      .single(),
  );
  return toCourse(row);
}
