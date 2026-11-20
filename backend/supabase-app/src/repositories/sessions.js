import { must, sb } from "../db/supabase.ts";
import { USER_COLS, toPublicUser } from "./mappers.ts";

export async function insert({ id, userId, tokenHash, createdAt, expiresAt, ip, userAgent }) {
  must(
    await sb.from("sessions").insert({
      id,
      user_id: userId,
      token_hash: tokenHash,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_seen_at: createdAt.toISOString(),
      ip,
      user_agent: userAgent,
    }),
  );
}

export async function findActiveByTokenHash(tokenHash, now) {
  const row = must(
    await sb
      .from("sessions")
      .select(`id, created_at, expires_at, last_seen_at, user:users!sessions_user_fk(${USER_COLS})`)
      .eq("token_hash", tokenHash)
      .gt("expires_at", now.toISOString())
      .maybeSingle(),
  );
  if (!row?.user) return null;
  return {
    session: {
      id: row.id,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      lastSeenAt: new Date(row.last_seen_at),
    },
    user: toPublicUser(row.user),
  };
}

export async function touch(id, now) {
  must(await sb.from("sessions").update({ last_seen_at: now.toISOString() }).eq("id", id));
}

export async function deleteByTokenHash(tokenHash) {
  must(await sb.from("sessions").delete().eq("token_hash", tokenHash));
}

export async function deleteExpired(now) {
  const { count, error } = await sb.from("sessions").delete({ count: "exact" }).lte("expires_at", now.toISOString());
  must({ error });
  return count ?? 0;
}
