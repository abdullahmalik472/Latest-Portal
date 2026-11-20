import type { PublicUser, Role } from "../types/domain.ts";

// Row -> API shape (identical to mysql-app). Embedded relations use explicit FK names because
// `courses` links both orgs and users, which would otherwise make PostgREST embeds ambiguous.
export const USER_COLS = "id, org_id, name, email, role, reg, created_at, org:orgs!users_org_fk(name)";
export const COURSE_COLS =
  "id, title, org_id, teacher_id, created_at, org:orgs!courses_org_fk(name), teacher:users!courses_teacher_fk(name)";

/** One users row as PostgREST returns it for USER_COLS (the org name arrives as an embedded object). */
export interface UserRow {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: Role;
  reg: string;
  created_at: string;
  org?: { name: string } | null;
  org_name?: string | null;
}

// Password hashes never leave the repository layer except via findCredentialsByEmail.
export const toPublicUser = (r: UserRow): PublicUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  orgId: r.org_id,
  orgName: r.org?.name ?? r.org_name ?? null,
  reg: r.reg,
  createdAt: new Date(r.created_at).toISOString(),
});

/** Clamp a LIMIT value to a safe integer. */
export const clampLimit = (n: unknown, max = 1000): number => Math.max(1, Math.min(max, Math.trunc(Number(n)) || 1));
