import type { PublicUser, Role } from "../types/domain.ts";

/** One users row joined with orgs (snake_case, straight from MySQL). */
export interface UserRow {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: Role;
  reg: string;
  created_at: Date;
  org_name?: string | null;
}

// Row -> API shape. Password hashes never leave the repository layer except via findCredentialsByEmail.
export const toPublicUser = (r: UserRow): PublicUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  orgId: r.org_id,
  orgName: r.org_name ?? null,
  reg: r.reg,
  createdAt: new Date(r.created_at).toISOString(),
});

/** Clamp a LIMIT value to a safe integer (inlined into SQL, never user text). */
export const clampLimit = (n: unknown, max = 1000): number => Math.max(1, Math.min(max, Math.trunc(Number(n)) || 1));
