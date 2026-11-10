import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** 256-bit random session token (sent to the browser in an HttpOnly cookie, never stored). */
export const newSessionToken = () => randomBytes(32).toString("base64url");

/** What we store in the database instead of the token itself. */
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

/** Constant-time string comparison (hashing first makes lengths equal). */
export function safeEqual(a, b) {
  const x = createHash("sha256").update(String(a)).digest();
  const y = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(x, y);
}

const REG_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
/** Registration number, e.g. REG-2026-7KQ4X9. Uniqueness is enforced by a DB constraint (callers retry). */
export function newRegNumber(date = new Date()) {
  let s = "";
  for (let i = 0; i < 6; i++) s += REG_ALPHABET[randomInt(REG_ALPHABET.length)];
  return `REG-${date.getUTCFullYear()}-${s}`;
}
