import { pool } from "../db/pool.js";
import { toPublicUser } from "./mappers.ts";

export async function insert({ id, userId, tokenHash, createdAt, expiresAt, ip, userAgent }) {
  await pool.execute(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, tokenHash, createdAt, expiresAt, createdAt, ip, userAgent],
  );
}

export async function findActiveByTokenHash(tokenHash, now) {
  const [rows] = await pool.execute(
    `SELECT s.id AS session_id, s.created_at AS session_created_at, s.expires_at, s.last_seen_at,
            u.id, u.org_id, u.name, u.email, u.role, u.reg, u.created_at, o.name AS org_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN orgs  o ON o.id = u.org_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    [tokenHash, now],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    session: {
      id: r.session_id,
      createdAt: new Date(r.session_created_at),
      expiresAt: new Date(r.expires_at),
      lastSeenAt: new Date(r.last_seen_at),
    },
    user: toPublicUser(r),
  };
}

export async function touch(id, now) {
  await pool.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", [now, id]);
}

export async function deleteByTokenHash(tokenHash) {
  await pool.execute("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
}

export async function deleteExpired(now) {
  const [res] = await pool.execute("DELETE FROM sessions WHERE expires_at <= ?", [now]);
  return res.affectedRows;
}
