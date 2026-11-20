import type { Role } from "../validation/schemas.ts";

/** The three roles. Generated from the Zod schema, so the validator and the types can never disagree. */
export type { Role };


/** A user as the backend knows it, INCLUDING the secret password hash. Never send this to a browser. */
export interface UserRecord {
  id: string;
  orgId: string;
  orgName: string | null;
  name: string;
  email: string;
  role: Role;
  reg: string;
  passwordHash: string;
  createdAt: string; // ISO date string
}

/** Omit: what the API may return, i.e. everything except the hash. */
export type PublicUser = Omit<UserRecord, "passwordHash">;

/** Pick: only what login needs to verify a password. */
export type Credentials = Pick<UserRecord, "id" | "orgId" | "passwordHash"> & { createdAt: Date };

/** Partial + Pick: optional filters for listing users. */
export type UserFilter = Partial<Pick<UserRecord, "role" | "orgId">> & { limit?: number };

/** Omit: what insert() receives. The database creates reg, and orgName comes from a JOIN. */
export type NewUser = Omit<UserRecord, "reg" | "orgName" | "createdAt"> & { createdAt: Date };

/** Omit: what is sent to Supabase during migration (orgs are matched by name there, not by id). */
export type MigrationUser = Omit<UserRecord, "orgId">;

/** Record: exactly one number per key, for the migration progress counters. */
export type MigrationCounts = Record<"total" | "migrated" | "pending" | "stuck", number>;
