import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Server-only client with the service-role key (bypasses RLS). Never expose this key to a browser.
export const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export class DbError extends Error {
  code: string;
  details: string;

  constructor(error: PostgrestError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}

/** The part of every supabase-js result that must() needs. */
interface DbResult {
  data?: unknown;
  error: PostgrestError | null;
}

/**
 * Unwraps a supabase-js result, throwing on error.
 * Generic: the caller states what the data looks like, e.g. must<UserRow[]>(await query).
 * Without a type argument the result is `unknown`, so TypeScript forces you to describe it before use.
 */
export function must<T = unknown>({ data, error }: DbResult): T {
  if (error) throw new DbError(error);
  return data as T;
}

/** Exact row count for a (filtered) query builder. */
export async function countOf(query: PromiseLike<{ count: number | null; error: PostgrestError | null }>): Promise<number> {
  const { count, error } = await query;
  if (error) throw new DbError(error);
  return count ?? 0;
}

/** True for a Postgres unique-constraint violation (optionally on one named constraint). */
export const isUniqueViolation = (err: { code?: string; message?: string } | null | undefined, constraint?: string): boolean =>
  err?.code === "23505" && (!constraint || String(err.message).includes(constraint));
