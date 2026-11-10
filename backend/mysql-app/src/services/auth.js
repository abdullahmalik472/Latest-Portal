import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import * as orgs from "../repositories/orgs.js";
import * as sessions from "../repositories/sessions.js";
import * as users from "../repositories/users.js";
import { hashToken, newSessionToken, safeEqual } from "../utils/crypto.js";
import { HttpError, badRequest, conflict, forbidden } from "../utils/errors.js";

// Compared against when the email is unknown, so "no such email" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-real-password", env.BCRYPT_ROUNDS);

const invalidCredentials = () => new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");

const sessionView = (s) => ({ id: s.id, createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString() });

/**
 * Creates an account. Rules:
 *  - the same email may exist in many orgs (and more than once in one org),
 *  - but every account with that email must have a different password.
 */
export async function createAccount({ name, email, password, role, orgId }) {
  if (!(await orgs.findById(orgId))) throw badRequest("ORG_NOT_FOUND", "Organization not found");

  for (const acc of await users.findCredentialsByEmail(email)) {
    if (await bcrypt.compare(password, acc.passwordHash)) {
      throw conflict("PASSWORD_REUSED", "This password is already used by another account with this email. Choose a different one.");
    }
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  return users.insert({ id: randomUUID(), orgId, name, email, passwordHash, role, createdAt: new Date() });
}

async function startSession(user, meta) {
  const token = newSessionToken();
  const now = new Date();
  const session = { id: randomUUID(), createdAt: now, expiresAt: new Date(now.getTime() + env.SESSION_TTL_HOURS * 3_600_000) };
  await sessions.insert({
    ...session,
    userId: user.id,
    tokenHash: hashToken(token),
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
  });
  return { token, user, session: sessionView(session) };
}

export async function register(input, meta) {
  if (input.role === "admin" && !safeEqual(input.adminCode ?? "", env.ADMIN_SIGNUP_CODE)) {
    throw forbidden("INVALID_ADMIN_CODE", "Invalid admin code");
  }
  const user = await createAccount(input);
  return startSession(user, meta);
}

/**
 * Email + password identify the account (passwords are unique per email), so we never need to
 * reveal which organizations an email belongs to before the password is verified.
 * Only if the password matches accounts in several orgs (possible after a migration) do we ask
 * the caller to pick one, and only among the orgs the password was already proven for.
 */
export async function login({ email, password, orgId }, meta) {
  const candidates = await users.findCredentialsByEmail(email);
  if (!candidates.length) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalidCredentials();
  }

  const matches = [];
  for (const acc of candidates) if (await bcrypt.compare(password, acc.passwordHash)) matches.push(acc);
  const scoped = orgId ? matches.filter((m) => m.orgId === orgId) : matches;
  if (!scoped.length) throw invalidCredentials();

  const orgIds = [...new Set(scoped.map((m) => m.orgId))];
  if (orgIds.length > 1) {
    throw conflict("ORG_REQUIRED", "This account exists in several organizations. Choose one.", { orgs: await orgs.findByIds(orgIds) });
  }

  const user = await users.findById(scoped[0].id); // candidates are ordered oldest first
  return startSession(user, meta);
}

export async function logout(token) {
  if (token) await sessions.deleteByTokenHash(hashToken(token));
}

export const me = ({ user, session }) => ({ user, session: sessionView(session) });
