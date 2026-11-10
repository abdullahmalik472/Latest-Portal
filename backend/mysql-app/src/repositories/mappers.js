// Row -> API shape. Password hashes never leave the repository layer except via findCredentialsByEmail.
export const toPublicUser = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  orgId: r.org_id,
  orgName: r.org_name ?? null,
  reg: r.reg,
  createdAt: new Date(r.created_at).toISOString(),
});

export const toCourse = (r) => ({
  id: r.id,
  title: r.title,
  orgId: r.org_id,
  teacherId: r.teacher_id,
  orgName: r.org_name ?? null,
  teacherName: r.teacher_name ?? null,
  createdAt: new Date(r.created_at).toISOString(),
});

/** Clamp a LIMIT value to a safe integer (inlined into SQL, never user text). */
export const clampLimit = (n, max = 1000) => Math.max(1, Math.min(max, Math.trunc(Number(n)) || 1));
