import { countOf, sb } from "../db/supabase.ts";

const head = (table) => sb.from(table).select("id", { count: "exact", head: true });

/** Dashboard counters. orgId = null means across all organizations (admin). */
export async function counts(orgId) {
  const scoped = (q) => (orgId ? q.eq("org_id", orgId) : q);
  const [students, teachers, courses, orgs] = await Promise.all([
    countOf(scoped(head("users").eq("role", "student"))),
    countOf(scoped(head("users").eq("role", "teacher"))),
    countOf(scoped(head("courses"))),
    countOf(head("orgs")),
  ]);
  return { students, teachers, courses, orgs };
}
