import * as sessions from "../repositories/sessions.js";
import { clearSessionCookie, readSessionCookie } from "../utils/cookies.js";
import { hashToken } from "../utils/crypto.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import { log } from "../utils/log.js";

const TOUCH_EVERY_MS = 5 * 60_000;

/** Resolves the session cookie to { user, session } on req.auth, or responds 401. */
export async function authenticate(req, res, next) {
  const token = readSessionCookie(req);
  if (!token) throw unauthorized();

  const now = new Date();
  const found = await sessions.findActiveByTokenHash(hashToken(token), now);
  if (!found) {
    clearSessionCookie(res);
    throw unauthorized("Your session has expired. Please sign in again.");
  }

  if (now - found.session.lastSeenAt > TOUCH_EVERY_MS) {
    sessions.touch(found.session.id, now).catch((err) => log.warn({ err }, "session touch failed"));
  }
  req.auth = found;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.auth?.user?.role)) throw forbidden();
  next();
};
