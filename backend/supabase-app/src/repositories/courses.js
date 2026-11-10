import { must, sb } from "../db/supabase.js";
import { COURSE_COLS, toCourse } from "./mappers.js";

export async function list({ orgId, teacherId } = {}) {
  let q = sb.from("courses").select(COURSE_COLS).order("created_at", { ascending: false });
  if (orgId) q = q.eq("org_id", orgId);
  if (teacherId) q = q.eq("teacher_id", teacherId);
  return must(await q).map(toCourse);
}

export async function insert({ id, orgId, teacherId, title, createdAt }) {
  const row = must(
    await sb
      .from("courses")
      .insert({ id, org_id: orgId, teacher_id: teacherId, title, created_at: createdAt.toISOString() })
      .select(COURSE_COLS)
      .single(),
  );
  return toCourse(row);
}
