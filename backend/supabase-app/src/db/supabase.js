import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Server-only client with the service-role key (bypasses RLS). Never expose this key to a browser.
export const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export class DbError extends Error {
  constructor(error) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}

/** Unwraps a supabase-js result, throwing on error. */
export function must({ data, error }) {
  if (error) throw new DbError(error);
  return data;
}

/** Exact row count for a (filtered) query builder. */
export async function countOf(query) {
  const { count, error } = await query;
  if (error) throw new DbError(error);
  return count ?? 0;
}

export const isUniqueViolation = (err, constraint) =>
  err?.code === "23505" && (!constraint || String(err.message).includes(constraint));
