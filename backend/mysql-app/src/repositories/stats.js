import { pool } from "../db/pool.js";

/** Dashboard counters. orgId = null means across all organizations (admin). */
export async function counts(orgId) {
  const [[row]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM users   WHERE role = 'student' AND (? IS NULL OR org_id = ?)) AS students,
       (SELECT COUNT(*) FROM users   WHERE role = 'teacher' AND (? IS NULL OR org_id = ?)) AS teachers,
       (SELECT COUNT(*) FROM courses WHERE (? IS NULL OR org_id = ?))                      AS courses,
       (SELECT COUNT(*) FROM orgs)                                                         AS orgs`,
    [orgId, orgId, orgId, orgId, orgId, orgId],
  );
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]));
}
