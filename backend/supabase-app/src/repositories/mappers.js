// Row -> API shape (identical to mysql-app). Embedded relations use explicit FK names because
// `courses` links both orgs and users, which would otherwise make PostgREST embeds ambiguous.
export const USER_COLS = "id, org_id, name, email, role, reg, created_at, org:orgs!users_org_fk(name)";
export const COURSE_COLS =
  "id, title, org_id, teacher_id, created_at, org:orgs!courses_org_fk(name), teacher:users!courses_teacher_fk(name)";

export const toPublicUser = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  orgId: r.org_id,
  orgName: r.org?.name ?? r.org_name ?? null,
  reg: r.reg,
  createdAt: new Date(r.created_at).toISOString(),
});

export const toCourse = (r) => ({
  id: r.id,
  title: r.title,
  orgId: r.org_id,
  teacherId: r.teacher_id,
  orgName: r.org?.name ?? null,
  teacherName: r.teacher?.name ?? null,
  createdAt: new Date(r.created_at).toISOString(),
});

export const clampLimit = (n, max = 1000) => Math.max(1, Math.min(max, Math.trunc(Number(n)) || 1));
